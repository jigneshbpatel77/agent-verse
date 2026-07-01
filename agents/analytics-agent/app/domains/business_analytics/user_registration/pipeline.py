"""Source-agnostic ingestion pipeline: source -> canonical staging -> masked warehouse.

The only source-specific step is `source.land_raw`. Normalization, schema validation, PII
masking, and the warehouse load are identical for CSV and RDS, so the cut-over to live RDS
changes nothing here.
"""
from __future__ import annotations

import logging

import duckdb

from app.config.settings import Settings, get_settings
from app.domains.business_analytics.user_registration import schema
from app.domains.business_analytics.user_registration.schema import SchemaValidation
from app.domains.business_analytics.user_registration.sources import UserRegistrationSource, build_source
from app.integrations.duckdb_client import connect as db_connect

logger = logging.getLogger(__name__)

RAW_TABLE = "_user_reg_raw"
STAGING_TABLE = "_user_reg_staging"
WAREHOUSE_TABLE = "user_registration_events"

WAREHOUSE_DDL = f"""
CREATE TABLE IF NOT EXISTS {WAREHOUSE_TABLE} (
    user_id BIGINT PRIMARY KEY,
    user_token_hash VARCHAR,
    email_hash VARCHAR,
    email_domain VARCHAR,
    mobile_hash VARCHAR,
    has_mobile BOOLEAN,
    has_device BOOLEAN,
    has_fcm_token BOOLEAN,
    source VARCHAR,
    platform VARCHAR,
    version_code VARCHAR,
    status INTEGER,
    is_mobile_verification_pending TINYINT,
    last_sync_status VARCHAR,
    registered_at TIMESTAMP,
    last_login TIMESTAMP,
    last_mobile_sync TIMESTAMP,
    updated_at TIMESTAMP,
    deleted_at TIMESTAMP,
    registered_date DATE,
    ingested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""


def _normalize(name: str) -> str:
    return name.strip().strip('"').strip("`").lower()


def _build_staging(conn: duckdb.DuckDBPyConnection, raw_columns: list[str]) -> None:
    """Create a canonical staging table: every canonical column as VARCHAR, missing -> NULL."""
    lookup = {_normalize(c): c for c in raw_columns}
    exprs = []
    for col in schema.ALL_COLUMNS:
        if col in lookup:
            exprs.append(f'CAST("{lookup[col]}" AS VARCHAR) AS {col}')
        else:
            exprs.append(f"CAST(NULL AS VARCHAR) AS {col}")
    conn.execute(
        f"CREATE OR REPLACE TEMP TABLE {STAGING_TABLE} AS SELECT {', '.join(exprs)} FROM {RAW_TABLE};"
    )


def _persist_warehouse(conn: duckdb.DuckDBPyConnection, retention_days: int) -> int:
    """Upsert staging rows into the warehouse, PII masked.

    retention_days > 0 caps to the last N days by registered_at; retention_days == 0 keeps
    every fetched row (used for the live RDS cut-over where the last 1000 rows are wanted).
    """
    conn.execute(WAREHOUSE_DDL)
    retention_clause = (
        f"AND CAST(registered_at AS DATE) >= (CURRENT_DATE - INTERVAL {int(retention_days)} DAY)"
        if retention_days and retention_days > 0
        else ""
    )
    # Hash/derive PII; never store raw identifiers. NULLIF empty strings first.
    conn.execute(
        f"""
        INSERT OR REPLACE INTO {WAREHOUSE_TABLE} BY NAME
        WITH s AS (
            SELECT
                TRY_CAST(id AS BIGINT) AS user_id,
                NULLIF(TRIM(email), '') AS email_raw,
                NULLIF(TRIM(mobile_number), '') AS mobile_raw,
                NULLIF(TRIM(user_token), '') AS token_raw,
                NULLIF(TRIM(device_id), '') AS device_raw,
                NULLIF(TRIM(fcm_token), '') AS fcm_raw,
                NULLIF(TRIM(source), '') AS source,
                NULLIF(TRIM(platform), '') AS platform,
                NULLIF(TRIM(version_code), '') AS version_code,
                TRY_CAST(status AS INTEGER) AS status,
                TRY_CAST(is_mobile_verification_pending AS TINYINT) AS is_mobile_verification_pending,
                NULLIF(TRIM(last_sync_status), '') AS last_sync_status,
                TRY_CAST(created_at AS TIMESTAMP) AS registered_at,
                TRY_CAST(last_login AS TIMESTAMP) AS last_login,
                TRY_CAST(last_mobile_sync AS TIMESTAMP) AS last_mobile_sync,
                TRY_CAST(updated_at AS TIMESTAMP) AS updated_at,
                TRY_CAST(deleted_at AS TIMESTAMP) AS deleted_at
            FROM {STAGING_TABLE}
        )
        SELECT
            user_id,
            md5(token_raw) AS user_token_hash,
            md5(lower(email_raw)) AS email_hash,
            CASE WHEN email_raw LIKE '%@%' THEN lower(split_part(email_raw, '@', 2)) END AS email_domain,
            md5(mobile_raw) AS mobile_hash,
            (mobile_raw IS NOT NULL) AS has_mobile,
            (device_raw IS NOT NULL) AS has_device,
            (fcm_raw IS NOT NULL) AS has_fcm_token,
            source, platform, version_code, status, is_mobile_verification_pending,
            last_sync_status, registered_at, last_login, last_mobile_sync, updated_at, deleted_at,
            CAST(registered_at AS DATE) AS registered_date,
            CURRENT_TIMESTAMP AS ingested_at
        FROM s
        WHERE user_id IS NOT NULL
          AND registered_at IS NOT NULL
          {retention_clause};
        """
    )
    return conn.execute(f"SELECT COUNT(*) FROM {WAREHOUSE_TABLE}").fetchone()[0]


def ingest_with_conn(
    conn: duckdb.DuckDBPyConnection,
    source: UserRegistrationSource,
    settings: Settings,
    steps: list[dict[str, str]],
) -> dict:
    """Land -> validate -> stage -> persist, on an existing connection.

    Leaves the canonical STAGING_TABLE in place so analysis can run over the full fetched
    set in the same connection.
    """
    raw_columns = source.land_raw(conn, RAW_TABLE)
    fetched = conn.execute(f"SELECT COUNT(*) FROM {RAW_TABLE}").fetchone()[0]
    steps.append({"message": f"Fetched {fetched} rows from '{source.name}' source.", "status": "success"})

    validation: SchemaValidation = schema.validate_columns(raw_columns)
    steps.append({"message": validation.message(), "status": "success" if validation.ok else "error"})
    if not validation.ok:
        raise ValueError(
            f"Schema mismatch — missing required columns {validation.missing_required}. "
            "CSV must match the RDS user_registration schema before cut-over."
        )

    _build_staging(conn, raw_columns)
    retention_days = settings.user_registration_retention_days
    persisted = _persist_warehouse(conn, retention_days)
    window = f"last {retention_days} days" if retention_days and retention_days > 0 else "all fetched rows, no date cap"
    steps.append(
        {
            "message": f"Persisted {persisted} rows ({window}, PII masked) into warehouse.",
            "status": "success",
        }
    )

    return {
        "source": source.name,
        "fetched_rows": fetched,
        "persisted_rows": persisted,
        "validation": validation,
        "staging_table": STAGING_TABLE,
    }


def ingest(
    source: UserRegistrationSource | None = None,
    settings: Settings | None = None,
) -> dict:
    """Run ingestion in its own connection. Returns validation + counts + steps."""
    settings = settings or get_settings()
    source = source or build_source(settings)
    steps: list[dict[str, str]] = []
    with db_connect() as conn:
        result = ingest_with_conn(conn, source, settings, steps)
    result["steps"] = steps
    return result
