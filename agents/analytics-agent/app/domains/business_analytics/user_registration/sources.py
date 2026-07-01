"""Pluggable data sources for user-registration ingestion.

A source's only job is to land raw rows into a DuckDB temp table. Everything downstream
(validation, PII masking, warehouse load, analysis) is source-agnostic, so flipping
USER_REGISTRATION_DATA_SOURCE between `csv` and `rds` requires no pipeline changes.
"""
from __future__ import annotations

import logging
import re
import time
from abc import ABC, abstractmethod
from pathlib import Path

import duckdb

from app.config.settings import Settings, get_settings

logger = logging.getLogger(__name__)

_PASSWORD_PATTERN = re.compile(r"passwd=[^\s'\"]+")


def _sanitize(error: Exception) -> str:
    return _PASSWORD_PATTERN.sub("passwd=<redacted>", str(error))


class UserRegistrationSource(ABC):
    name: str

    @abstractmethod
    def land_raw(self, conn: duckdb.DuckDBPyConnection, raw_table: str) -> list[str]:
        """Create the TEMP table `raw_table` with source rows; return its column names."""


class CSVSource(UserRegistrationSource):
    name = "csv"

    def __init__(self, path: str) -> None:
        if not path:
            raise ValueError("USER_REGISTRATION_CSV_PATH is not set.")
        self.path = str(Path(path).expanduser())
        if not Path(self.path).is_file():
            raise FileNotFoundError(f"CSV not found: {self.path}")

    def land_raw(self, conn: duckdb.DuckDBPyConnection, raw_table: str) -> list[str]:
        # all_varchar keeps loading robust; the pipeline casts canonically afterwards.
        conn.execute(
            f"CREATE OR REPLACE TEMP TABLE {raw_table} AS "
            "SELECT * FROM read_csv_auto(?, header=true, all_varchar=true);",
            [self.path],
        )
        cols = [row[1] for row in conn.execute(f"PRAGMA table_info('{raw_table}');").fetchall()]
        logger.info("CSVSource landed %s columns from %s", len(cols), self.path)
        return cols


class RDSSource(UserRegistrationSource):
    """RC read-replica source via the DuckDB MySQL extension (READ_ONLY ATTACH).

    This mirrors the established ingestion pattern used by the other datasets
    (app/domains/business_analytics/ingestion.py). The MySQL extension manages its own
    connection pool behind the ATTACH; transient connect/reset failures are retried with
    exponential backoff so a brief replica blip or reconnect is handled gracefully.
    """

    name = "rds"

    def __init__(self, profile: dict, limit: int, max_retries: int = 3, backoff_seconds: float = 2.0) -> None:
        self.profile = profile
        self.limit = limit
        self.max_retries = max_retries
        self.backoff_seconds = backoff_seconds
        self._alias = "rc_user_reg_src"

    def _detach(self, conn: duckdb.DuckDBPyConnection) -> None:
        try:
            conn.execute(f"DETACH DATABASE IF EXISTS {self._alias};")
        except Exception:
            pass

    def _attach(self, conn: duckdb.DuckDBPyConnection) -> None:
        try:
            conn.execute("LOAD mysql;")
        except Exception:
            conn.execute("INSTALL mysql;")
            conn.execute("LOAD mysql;")

        parts = [
            f"host={self.profile['host']}",
            f"port={self.profile['port']}",
            f"user={self.profile['user']}",
            f"db={self.profile['db']}",
        ]
        if self.profile.get("password"):
            parts.append(f"passwd={str(self.profile['password']).strip(chr(39) + chr(34))}")
        if self.profile.get("ssl_mode"):
            parts.append(f"ssl_mode={self.profile['ssl_mode']}")

        self._detach(conn)
        conn.execute(f"ATTACH '{' '.join(parts)}' AS {self._alias} (TYPE MYSQL, READ_ONLY);")

    def _land_once(self, conn: duckdb.DuckDBPyConnection, raw_table: str) -> list[str]:
        self._attach(conn)
        table = self.profile["table"]
        # Last N rows by recency; created_at is the business signup timestamp.
        query = f"SELECT * FROM {table} ORDER BY created_at DESC, id DESC LIMIT {int(self.limit)}"
        conn.execute(
            f"CREATE OR REPLACE TEMP TABLE {raw_table} AS SELECT * FROM mysql_query(?, ?);",
            [self._alias, query],
        )
        cols = [row[1] for row in conn.execute(f"PRAGMA table_info('{raw_table}');").fetchall()]
        logger.info("RDSSource landed %s columns from %s", len(cols), table)
        return cols

    def land_raw(self, conn: duckdb.DuckDBPyConnection, raw_table: str) -> list[str]:
        last_exc: Exception | None = None
        for attempt in range(1, self.max_retries + 1):
            try:
                return self._land_once(conn, raw_table)
            except Exception as exc:
                last_exc = exc
                if attempt < self.max_retries:
                    wait = self.backoff_seconds * (2 ** (attempt - 1))
                    logger.warning(
                        "RDS attach/fetch attempt %s/%s failed: %s. Retrying in %.1fs.",
                        attempt,
                        self.max_retries,
                        _sanitize(exc),
                        wait,
                    )
                    time.sleep(wait)
            finally:
                self._detach(conn)
        raise RuntimeError(
            f"RDS source failed after {self.max_retries} attempts: {_sanitize(last_exc) if last_exc else 'unknown'}"
        ) from last_exc


def build_source(settings: Settings | None = None) -> UserRegistrationSource:
    settings = settings or get_settings()
    kind = (settings.user_registration_data_source or "csv").strip().lower()
    if kind == "csv":
        return CSVSource(settings.user_registration_csv_path)
    if kind == "rds":
        return RDSSource(
            settings.user_registration_rds_profile(),
            settings.user_registration_fetch_limit,
            max_retries=settings.user_registration_rds_max_retries,
            backoff_seconds=settings.user_registration_rds_retry_backoff_seconds,
        )
    raise ValueError(f"Unsupported USER_REGISTRATION_DATA_SOURCE: {kind!r} (use 'csv' or 'rds').")
