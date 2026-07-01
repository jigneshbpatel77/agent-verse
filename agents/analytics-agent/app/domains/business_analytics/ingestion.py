import logging
import re
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

import duckdb

from app.config.settings import get_settings
from app.domains.business_analytics.repositories import BusinessAnalyticsRepository
from app.integrations.duckdb_client import connect as db_connect

logger = logging.getLogger(__name__)

SOURCE_TABLES = ["challan_payment", "service_history_payments", "buy_fastag_payment"]
PASSWORD_PATTERN = re.compile(r"passwd=[^\s'\"]+")
POLICYBAZAAR_BIKE_RATE = Decimal("200.00")
POLICYBAZAAR_CAR_RATE = Decimal("600.00")
POLICYBAZAAR_CV_RATE = Decimal("1200.00")

POLICYBAZAAR_BIKE_SAMPLE_ROWS: list[dict[str, Any]] = [
    {"report_date": date(2026, 6, 10), "raw_r": 56398, "raw_l": 53015, "bike_sale_count": 942, "non_saod": 876, "saod": 66, "crm": 423, "non_crm": 519, "r2b": Decimal("1.67")},
    {"report_date": date(2026, 6, 11), "raw_r": 62141, "raw_l": 59335, "bike_sale_count": 870, "non_saod": 788, "saod": 82, "crm": 363, "non_crm": 507, "r2b": Decimal("1.40")},
    {"report_date": date(2026, 6, 12), "raw_r": 24519, "raw_l": 22745, "bike_sale_count": 254, "non_saod": 228, "saod": 26, "crm": 73, "non_crm": 181, "r2b": Decimal("1.04")},
    {"report_date": date(2026, 6, 13), "raw_r": 61658, "raw_l": 59852, "bike_sale_count": 943, "non_saod": 858, "saod": 85, "crm": 437, "non_crm": 506, "r2b": Decimal("1.53")},
    {"report_date": date(2026, 6, 14), "raw_r": 60420, "raw_l": 57910, "bike_sale_count": 882, "non_saod": 809, "saod": 73, "crm": 392, "non_crm": 490, "r2b": Decimal("1.46")},
    {"report_date": date(2026, 6, 15), "raw_r": 58110, "raw_l": 54228, "bike_sale_count": 816, "non_saod": 748, "saod": 68, "crm": 351, "non_crm": 465, "r2b": Decimal("1.40")},
    {"report_date": date(2026, 6, 16), "raw_r": 59772, "raw_l": 56108, "bike_sale_count": 834, "non_saod": 762, "saod": 72, "crm": 379, "non_crm": 455, "r2b": Decimal("1.40")},
    {"report_date": date(2026, 6, 17), "raw_r": 58961, "raw_l": 55480, "bike_sale_count": 791, "non_saod": 724, "saod": 67, "crm": 348, "non_crm": 443, "r2b": Decimal("1.34")},
    {"report_date": date(2026, 6, 18), "raw_r": 61275, "raw_l": 57318, "bike_sale_count": 804, "non_saod": 736, "saod": 68, "crm": 356, "non_crm": 448, "r2b": Decimal("1.31")},
    {"report_date": date(2026, 6, 19), "raw_r": 62840, "raw_l": 58642, "bike_sale_count": 837, "non_saod": 764, "saod": 73, "crm": 371, "non_crm": 466, "r2b": Decimal("1.33")},
    {"report_date": date(2026, 6, 20), "raw_r": 60118, "raw_l": 56204, "bike_sale_count": 768, "non_saod": 703, "saod": 65, "crm": 339, "non_crm": 429, "r2b": Decimal("1.28")},
    {"report_date": date(2026, 6, 21), "raw_r": 57525, "raw_l": 53160, "bike_sale_count": 699, "non_saod": 642, "saod": 57, "crm": 302, "non_crm": 397, "r2b": Decimal("1.22")},
    {"report_date": date(2026, 6, 22), "raw_r": 60990, "raw_l": 56618, "bike_sale_count": 722, "non_saod": 661, "saod": 61, "crm": 314, "non_crm": 408, "r2b": Decimal("1.18")},
    {"report_date": date(2026, 6, 23), "raw_r": 58874, "raw_l": 54120, "bike_sale_count": 641, "non_saod": 589, "saod": 52, "crm": 273, "non_crm": 368, "r2b": Decimal("1.09")},
    {"report_date": date(2026, 6, 24), "raw_r": 55210, "raw_l": 50642, "bike_sale_count": 503, "non_saod": 459, "saod": 44, "crm": 218, "non_crm": 285, "r2b": Decimal("0.91")},
]

POLICYBAZAAR_CAR_SAMPLE_ROWS: list[dict[str, Any]] = [
    {"report_date": date(2026, 6, 10), "raw_r": 8420, "raw_l": 7891, "car_sale_count": 148, "non_saod": 112, "saod": 36, "crm": 68, "non_crm": 80, "r2b": Decimal("1.75")},
    {"report_date": date(2026, 6, 11), "raw_r": 9012, "raw_l": 8534, "car_sale_count": 162, "non_saod": 124, "saod": 38, "crm": 74, "non_crm": 88, "r2b": Decimal("1.80")},
    {"report_date": date(2026, 6, 12), "raw_r": 3540, "raw_l": 3210, "car_sale_count": 58, "non_saod": 44, "saod": 14, "crm": 26, "non_crm": 32, "r2b": Decimal("1.62")},
    {"report_date": date(2026, 6, 13), "raw_r": 8910, "raw_l": 8401, "car_sale_count": 155, "non_saod": 118, "saod": 37, "crm": 71, "non_crm": 84, "r2b": Decimal("1.74")},
    {"report_date": date(2026, 6, 14), "raw_r": 8754, "raw_l": 8212, "car_sale_count": 143, "non_saod": 109, "saod": 34, "crm": 65, "non_crm": 78, "r2b": Decimal("1.63")},
    {"report_date": date(2026, 6, 15), "raw_r": 8290, "raw_l": 7740, "car_sale_count": 137, "non_saod": 104, "saod": 33, "crm": 62, "non_crm": 75, "r2b": Decimal("1.65")},
    {"report_date": date(2026, 6, 16), "raw_r": 8480, "raw_l": 7980, "car_sale_count": 141, "non_saod": 107, "saod": 34, "crm": 64, "non_crm": 77, "r2b": Decimal("1.66")},
    {"report_date": date(2026, 6, 17), "raw_r": 8320, "raw_l": 7801, "car_sale_count": 134, "non_saod": 102, "saod": 32, "crm": 61, "non_crm": 73, "r2b": Decimal("1.61")},
    {"report_date": date(2026, 6, 18), "raw_r": 8540, "raw_l": 8010, "car_sale_count": 139, "non_saod": 106, "saod": 33, "crm": 63, "non_crm": 76, "r2b": Decimal("1.63")},
    {"report_date": date(2026, 6, 19), "raw_r": 8780, "raw_l": 8230, "car_sale_count": 146, "non_saod": 111, "saod": 35, "crm": 66, "non_crm": 80, "r2b": Decimal("1.67")},
    {"report_date": date(2026, 6, 20), "raw_r": 8410, "raw_l": 7882, "car_sale_count": 131, "non_saod": 100, "saod": 31, "crm": 59, "non_crm": 72, "r2b": Decimal("1.56")},
    {"report_date": date(2026, 6, 21), "raw_r": 7980, "raw_l": 7420, "car_sale_count": 122, "non_saod": 93, "saod": 29, "crm": 55, "non_crm": 67, "r2b": Decimal("1.53")},
    {"report_date": date(2026, 6, 22), "raw_r": 8210, "raw_l": 7670, "car_sale_count": 127, "non_saod": 97, "saod": 30, "crm": 57, "non_crm": 70, "r2b": Decimal("1.55")},
    {"report_date": date(2026, 6, 23), "raw_r": 8050, "raw_l": 7490, "car_sale_count": 118, "non_saod": 90, "saod": 28, "crm": 53, "non_crm": 65, "r2b": Decimal("1.47")},
    {"report_date": date(2026, 6, 24), "raw_r": 18682, "raw_l": 18682, "car_sale_count": 145, "non_saod": 0, "saod": 0, "crm": 0, "non_crm": 0, "r2b": Decimal("0.0")},
]

POLICYBAZAAR_CV_SAMPLE_ROWS: list[dict[str, Any]] = [
    {"report_date": date(2026, 6, 10), "raw_r": 1840, "raw_l": 1680, "cv_sale_count": 34, "non_saod": 22, "saod": 12, "crm": 15, "non_crm": 19, "r2b": Decimal("1.85")},
    {"report_date": date(2026, 6, 11), "raw_r": 2010, "raw_l": 1840, "cv_sale_count": 38, "non_saod": 25, "saod": 13, "crm": 17, "non_crm": 21, "r2b": Decimal("1.88")},
    {"report_date": date(2026, 6, 12), "raw_r": 760, "raw_l": 680, "cv_sale_count": 12, "non_saod": 8, "saod": 4, "crm": 5, "non_crm": 7, "r2b": Decimal("1.58")},
    {"report_date": date(2026, 6, 13), "raw_r": 1980, "raw_l": 1810, "cv_sale_count": 36, "non_saod": 23, "saod": 13, "crm": 16, "non_crm": 20, "r2b": Decimal("1.82")},
    {"report_date": date(2026, 6, 14), "raw_r": 1920, "raw_l": 1752, "cv_sale_count": 33, "non_saod": 21, "saod": 12, "crm": 15, "non_crm": 18, "r2b": Decimal("1.72")},
    {"report_date": date(2026, 6, 15), "raw_r": 1810, "raw_l": 1640, "cv_sale_count": 31, "non_saod": 20, "saod": 11, "crm": 14, "non_crm": 17, "r2b": Decimal("1.71")},
    {"report_date": date(2026, 6, 16), "raw_r": 1870, "raw_l": 1700, "cv_sale_count": 32, "non_saod": 21, "saod": 11, "crm": 14, "non_crm": 18, "r2b": Decimal("1.71")},
    {"report_date": date(2026, 6, 17), "raw_r": 1840, "raw_l": 1672, "cv_sale_count": 30, "non_saod": 19, "saod": 11, "crm": 13, "non_crm": 17, "r2b": Decimal("1.63")},
    {"report_date": date(2026, 6, 18), "raw_r": 1880, "raw_l": 1710, "cv_sale_count": 31, "non_saod": 20, "saod": 11, "crm": 14, "non_crm": 17, "r2b": Decimal("1.65")},
    {"report_date": date(2026, 6, 19), "raw_r": 1940, "raw_l": 1762, "cv_sale_count": 33, "non_saod": 21, "saod": 12, "crm": 15, "non_crm": 18, "r2b": Decimal("1.70")},
    {"report_date": date(2026, 6, 20), "raw_r": 1860, "raw_l": 1690, "cv_sale_count": 29, "non_saod": 19, "saod": 10, "crm": 13, "non_crm": 16, "r2b": Decimal("1.55")},
    {"report_date": date(2026, 6, 21), "raw_r": 1740, "raw_l": 1572, "cv_sale_count": 27, "non_saod": 17, "saod": 10, "crm": 12, "non_crm": 15, "r2b": Decimal("1.55")},
    {"report_date": date(2026, 6, 22), "raw_r": 1800, "raw_l": 1632, "cv_sale_count": 28, "non_saod": 18, "saod": 10, "crm": 13, "non_crm": 15, "r2b": Decimal("1.56")},
    {"report_date": date(2026, 6, 23), "raw_r": 1760, "raw_l": 1592, "cv_sale_count": 26, "non_saod": 17, "saod": 9, "crm": 12, "non_crm": 14, "r2b": Decimal("1.48")},
    {"report_date": date(2026, 6, 24), "raw_r": 21496, "raw_l": 21496, "cv_sale_count": 16, "non_saod": 0, "saod": 0, "crm": 0, "non_crm": 0, "r2b": Decimal("0.0")},
]


def ensure_mysql_extension(conn: duckdb.DuckDBPyConnection, steps: list[dict[str, str]]) -> bool:
    try:
        conn.execute("LOAD mysql;")
        return True
    except Exception:
        try:
            conn.execute("INSTALL mysql;")
            conn.execute("LOAD mysql;")
            return True
        except Exception as exc:
            message = f"DuckDB MySQL extension unavailable: {exc}. Using local sample data."
            logger.warning(message)
            steps.append({"message": message, "status": "warning"})
            return False


def get_mysql_profile(source_table: str) -> dict:
    return get_settings().mysql_profile_for(source_table)


def attach_sources(conn: duckdb.DuckDBPyConnection, steps: list[dict[str, str]], mysql_enabled: bool) -> dict[str, str | None]:
    aliases: dict[str, str | None] = {}
    settings = get_settings()
    use_local_fallback_only = settings.business_analytics_local_fallback_only

    for source_table in SOURCE_TABLES:
        alias = f"mysql_{source_table}"
        aliases[source_table] = alias if mysql_enabled and not use_local_fallback_only else None

        if use_local_fallback_only:
            steps.append({"message": f"Using local fallback data for {source_table}.", "status": "warning"})
            continue

        if not mysql_enabled:
            continue

        profile = get_mysql_profile(source_table)
        try:
            conn.execute(f"DETACH DATABASE IF EXISTS {alias};")
        except Exception:
            pass

        parts = [
            f"host={profile['host']}",
            f"port={profile['port']}",
            f"user={profile['user']}",
            f"db={profile['db']}",
        ]
        if profile["password"]:
            password = str(profile["password"]).strip("'\"")
            parts.append(f"passwd={password}")
        if profile["ssl_mode"]:
            parts.append(f"ssl_mode={profile['ssl_mode']}")

        try:
            conn.execute(f"ATTACH '{' '.join(parts)}' AS {alias} (TYPE MYSQL, READ_ONLY);")
            steps.append({"message": f"Attached MySQL source for {source_table}.", "status": "success"})
        except Exception as exc:
            aliases[source_table] = None
            message = f"Could not attach MySQL source for {source_table}: {sanitize_error(exc)}. Local fallback active."
            logger.warning(message)
            steps.append({"message": message, "status": "warning"})

    return aliases


def detach_sources(conn: duckdb.DuckDBPyConnection) -> None:
    for source_table in SOURCE_TABLES:
        try:
            conn.execute(f"DETACH DATABASE IF EXISTS mysql_{source_table};")
        except Exception:
            pass


def sync_7_day_window(conn: duckdb.DuckDBPyConnection, aliases: dict[str, str | None], steps: list[dict[str, str]]) -> int:
    cutoff_date = date.today() - timedelta(days=6)
    cutoff_iso = cutoff_date.isoformat()
    use_local_fallback_only = get_settings().business_analytics_local_fallback_only
    BusinessAnalyticsRepository.initialize_tables(conn)
    if not use_local_fallback_only:
        purge_sample_rows(conn)
    steps.append({"message": f"Ingesting data on or after {cutoff_iso}.", "status": "success"})

    total_loaded = 0
    for local_table, config in table_configs().items():
        alias = aliases.get(local_table)
        if not alias or not mysql_source_available(conn, alias, config["mysql_table"]):
            if use_local_fallback_only:
                seed_sample_rows(conn, local_table)
                steps.append({"message": f"Seeded local sample rows for {local_table}.", "status": "warning"})
            else:
                steps.append({"message": f"Skipped {local_table}: RDS source is unavailable.", "status": "warning"})
            continue

        loaded_rows = sync_table(conn, alias, local_table, config, cutoff_iso, steps)
        conn.execute(f"DELETE FROM {local_table} WHERE payment_date < ?", [cutoff_date])
        total_loaded += loaded_rows
        steps.append({"message": f"Ingested {loaded_rows} records for {local_table}.", "status": "success"})

    if get_settings().enable_policybazaar_email_ingestion:
        steps.append(
            {
                "message": "Policybazaar email ingestion is enabled; Gmail push/backfill owns bike daily refresh.",
                "status": "success",
            }
        )
    else:
        total_loaded += refresh_policybazaar_bike_daily_window(conn, steps)
    return total_loaded


def mysql_source_available(conn: duckdb.DuckDBPyConnection, alias: str, mysql_table: str) -> bool:
    try:
        conn.execute("SELECT COUNT(*) FROM mysql_query(?, ?)", [alias, f"SELECT 1 FROM {mysql_table} LIMIT 1"])
        return True
    except Exception:
        return False


def sanitize_error(error: Exception) -> str:
    return PASSWORD_PATTERN.sub("passwd=<redacted>", str(error))


def sync_table(
    conn: duckdb.DuckDBPyConnection,
    alias: str,
    local_table: str,
    config: dict[str, str],
    cutoff_iso: str,
    steps: list[dict[str, str]],
) -> int:
    batch_size = 5000
    mysql_table = config["mysql_table"]
    date_column = config["date_column"]
    start_row = conn.execute(
        "SELECT * FROM mysql_query(?, ?)",
        [alias, f"SELECT MIN(id) FROM {mysql_table} WHERE {date_column} >= '{cutoff_iso}'"],
    ).fetchone()
    start_id = start_row[0] if start_row and start_row[0] is not None else None

    if start_id is None:
        steps.append({"message": f"No new records in the 7-day window for {local_table}.", "status": "success"})
        return 0

    last_id = int(start_id) - 1
    loaded_rows = 0

    while True:
        mysql_query = (
            f"SELECT {config['raw_columns']} FROM {mysql_table} "
            f"WHERE id > {last_id} AND {date_column} >= '{cutoff_iso}' "
            f"ORDER BY id ASC LIMIT {batch_size}"
        )
        conn.execute("CREATE OR REPLACE TEMP TABLE _batch AS SELECT * FROM mysql_query(?, ?)", [alias, mysql_query])
        batch_count = conn.execute("SELECT COUNT(*) FROM _batch").fetchone()[0]

        if batch_count == 0:
            conn.execute("DROP TABLE IF EXISTS _batch;")
            break

        conn.execute(f"DELETE FROM {local_table} WHERE id IN (SELECT CAST(id AS VARCHAR) FROM _batch);")
        conn.execute(f"INSERT INTO {local_table} {config['duckdb_projection']}")
        last_id = int(conn.execute("SELECT MAX(id) FROM _batch").fetchone()[0])
        loaded_rows += batch_count
        steps.append({"message": f"Fetched {batch_count} records from {mysql_table}.", "status": "success"})
        conn.execute("DROP TABLE _batch;")

        if batch_count < batch_size:
            break

    return loaded_rows


def purge_sample_rows(conn: duckdb.DuckDBPyConnection) -> None:
    conn.execute("DELETE FROM challan_payment WHERE id LIKE 'sample-%';")
    conn.execute("DELETE FROM service_history_payments WHERE id LIKE 'sample-%';")
    conn.execute("DELETE FROM buy_fastag_payment WHERE id LIKE 'sample-%';")


def seed_sample_rows(conn: duckdb.DuckDBPyConnection, local_table: str) -> None:
    today = date.today().isoformat()
    yesterday = (date.today() - timedelta(days=1)).isoformat()

    if local_table == "challan_payment":
        conn.execute(
            """
            INSERT INTO challan_payment VALUES
            ('sample-challan-1', 'CH-1002', 'DL-3C-AS-1234', 150.00, 120.00, 5.00, 0.00, ?, 'SETTLED', 'Settle', '1'),
            ('sample-challan-2', 'CH-1003', 'MH-12-PQ-5678', 150.00, 120.00, 5.00, 0.00, ?, 'SETTLED', 'Settle', '1'),
            ('sample-challan-3', 'CH-1004', 'KA-03-MM-9999', 200.00, 160.00, 7.50, 0.00, ?, 'PROCESSING', 'Processing', '1'),
            ('sample-challan-4', 'CH-1005', 'HR-26-ZZ-0001', 150.00, 120.00, 5.00, 150.00, ?, 'REFUNDED', 'Refunded', '1')
            ON CONFLICT (id) DO NOTHING;
            """,
            [yesterday, yesterday, today, today],
        )
    elif local_table == "service_history_payments":
        conn.execute(
            """
            INSERT INTO service_history_payments VALUES
            ('sample-service-1', 'TXN-9021', 'DL-3C-AS-1111', 100.00, 80.00, 3.00, 0.00, ?, 'SUCCESS'),
            ('sample-service-2', 'TXN-9022', 'MH-12-PQ-2222', 120.00, 96.00, 3.60, 0.00, ?, 'SUCCESS')
            ON CONFLICT (id) DO NOTHING;
            """,
            [yesterday, today],
        )
    elif local_table == "buy_fastag_payment":
        conn.execute(
            """
            INSERT INTO buy_fastag_payment VALUES
            ('sample-fastag-1', 'ORD-501', 'KA-03-MM-3333', 50.00, 40.00, 1.50, 0.00, ?, 'SUCCESS'),
            ('sample-fastag-2', 'ORD-502', 'HR-26-ZZ-4444', 50.00, 40.00, 1.50, 0.00, ?, 'SUCCESS')
            ON CONFLICT (id) DO NOTHING;
            """,
            [yesterday, today],
        )


def refresh_policybazaar_bike_daily_window(conn: duckdb.DuckDBPyConnection, steps: list[dict[str, str]]) -> int:
    cutoff_date = date.today() - timedelta(days=14)
    source_report_date = date.today()
    total = 0

    bike_rows = [row for row in POLICYBAZAAR_BIKE_SAMPLE_ROWS if row["report_date"] >= cutoff_date]
    if bike_rows:
        upsert_policybazaar_bike_daily_rows(conn, bike_rows, source_report_date)
        steps.append({"message": f"Refreshed {len(bike_rows)} Policybazaar bike daily rows from {cutoff_date.isoformat()}.", "status": "success"})
        total += len(bike_rows)
    else:
        steps.append({"message": "No Policybazaar bike daily rows available for the last 15 days.", "status": "warning"})

    car_rows = [row for row in POLICYBAZAAR_CAR_SAMPLE_ROWS if row["report_date"] >= cutoff_date]
    if car_rows:
        upsert_policybazaar_car_daily_rows(conn, car_rows, source_report_date)
        steps.append({"message": f"Refreshed {len(car_rows)} Policybazaar car daily rows from {cutoff_date.isoformat()}.", "status": "success"})
        total += len(car_rows)
    else:
        steps.append({"message": "No Policybazaar car daily rows available for the last 15 days.", "status": "warning"})

    cv_rows = [row for row in POLICYBAZAAR_CV_SAMPLE_ROWS if row["report_date"] >= cutoff_date]
    if cv_rows:
        upsert_policybazaar_cv_daily_rows(conn, cv_rows, source_report_date)
        steps.append({"message": f"Refreshed {len(cv_rows)} Policybazaar CV daily rows from {cutoff_date.isoformat()}.", "status": "success"})
        total += len(cv_rows)
    else:
        steps.append({"message": "No Policybazaar CV daily rows available for the last 15 days.", "status": "warning"})

    return total


def upsert_policybazaar_bike_daily_rows(
    conn: duckdb.DuckDBPyConnection,
    rows: list[dict[str, Any]],
    source_report_date: date | None = None,
) -> int:
    BusinessAnalyticsRepository.initialize_tables(conn)

    for row in rows:
        report_date = row["report_date"]
        rate_per_sale = Decimal(str(row.get("rate_per_sale", POLICYBAZAAR_BIKE_RATE)))
        bike_sale_count = int(row["bike_sale_count"])
        revenue = rate_per_sale * Decimal(bike_sale_count)

        conn.execute("DELETE FROM policybazaar_bike_daily WHERE report_date = ?", [report_date])
        conn.execute(
            """
            INSERT INTO policybazaar_bike_daily (
                report_date,
                raw_r,
                raw_l,
                bike_sale_count,
                non_saod,
                saod,
                crm,
                non_crm,
                r2b,
                rate_per_sale,
                revenue,
                source,
                source_report_date,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'policybazaar_email', ?, CURRENT_TIMESTAMP);
            """,
            [
                report_date,
                int(row.get("raw_r", 0)),
                int(row.get("raw_l", 0)),
                bike_sale_count,
                int(row.get("non_saod", 0)),
                int(row.get("saod", 0)),
                int(row.get("crm", 0)),
                int(row.get("non_crm", 0)),
                Decimal(str(row.get("r2b", Decimal("0.0")))),
                rate_per_sale,
                revenue,
                source_report_date,
            ],
        )

    return len(rows)


def upsert_policybazaar_car_daily_rows(
    conn: duckdb.DuckDBPyConnection,
    rows: list[dict[str, Any]],
    source_report_date: date | None = None,
) -> int:
    BusinessAnalyticsRepository.initialize_tables(conn)

    for row in rows:
        report_date = row["report_date"]
        rate_per_sale = Decimal(str(row.get("rate_per_sale", POLICYBAZAAR_CAR_RATE)))
        car_sale_count = int(row["car_sale_count"])
        revenue = rate_per_sale * Decimal(car_sale_count)

        conn.execute("DELETE FROM policybazaar_car_daily WHERE report_date = ?", [report_date])
        conn.execute(
            """
            INSERT INTO policybazaar_car_daily (
                report_date,
                raw_r,
                raw_l,
                car_sale_count,
                non_saod,
                saod,
                crm,
                non_crm,
                r2b,
                rate_per_sale,
                revenue,
                source,
                source_report_date,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'policybazaar_email', ?, CURRENT_TIMESTAMP);
            """,
            [
                report_date,
                int(row.get("raw_r", 0)),
                int(row.get("raw_l", 0)),
                car_sale_count,
                int(row.get("non_saod", 0)),
                int(row.get("saod", 0)),
                int(row.get("crm", 0)),
                int(row.get("non_crm", 0)),
                Decimal(str(row.get("r2b", Decimal("0.0")))),
                rate_per_sale,
                revenue,
                source_report_date,
            ],
        )

    return len(rows)


def upsert_policybazaar_cv_daily_rows(
    conn: duckdb.DuckDBPyConnection,
    rows: list[dict[str, Any]],
    source_report_date: date | None = None,
) -> int:
    BusinessAnalyticsRepository.initialize_tables(conn)

    for row in rows:
        report_date = row["report_date"]
        rate_per_sale = Decimal(str(row.get("rate_per_sale", POLICYBAZAAR_CV_RATE)))
        cv_sale_count = int(row["cv_sale_count"])
        revenue = rate_per_sale * Decimal(cv_sale_count)

        conn.execute("DELETE FROM policybazaar_cv_daily WHERE report_date = ?", [report_date])
        conn.execute(
            """
            INSERT INTO policybazaar_cv_daily (
                report_date,
                raw_r,
                raw_l,
                cv_sale_count,
                non_saod,
                saod,
                crm,
                non_crm,
                r2b,
                rate_per_sale,
                revenue,
                source,
                source_report_date,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'policybazaar_email', ?, CURRENT_TIMESTAMP);
            """,
            [
                report_date,
                int(row.get("raw_r", 0)),
                int(row.get("raw_l", 0)),
                cv_sale_count,
                int(row.get("non_saod", 0)),
                int(row.get("saod", 0)),
                int(row.get("crm", 0)),
                int(row.get("non_crm", 0)),
                Decimal(str(row.get("r2b", Decimal("0.0")))),
                rate_per_sale,
                revenue,
                source_report_date,
            ],
        )

    return len(rows)


def table_configs() -> dict[str, dict[str, str]]:
    return {
        "challan_payment": {
            "mysql_table": get_mysql_profile("challan_payment")["table"],
            "raw_columns": (
                "id, challan_no, reg_number, convenience_fees, partner_fee, paid_partner_fee_to_partner, paid_status, "
                "payment_refund_amount, amount_refunded, total_refund_amount, convenience_fee_data, created_at, status"
            ),
            "duckdb_projection": """
                SELECT
                    CAST(id AS VARCHAR) AS id,
                    challan_no AS challan_number,
                    reg_number AS vehicle_number,
                    COALESCE(
                        TRY_CAST(convenience_fees AS DECIMAL(18, 2)),
                        TRY_CAST(json_extract_string(convenience_fee_data, '$.convenience_fee') AS DECIMAL(18, 2)),
                        0.0
                    ) AS convenience_fee,
                    COALESCE(
                        TRY_CAST(partner_fee AS DECIMAL(18, 2)),
                        TRY_CAST(paid_partner_fee_to_partner AS DECIMAL(18, 2)),
                        0.0
                    ) AS vendor_payout,
                    COALESCE(
                        TRY_CAST(json_extract_string(convenience_fee_data, '$.platform_gateway_fee') AS DECIMAL(18, 2)),
                        0.0
                    ) AS pg_fee,
                    COALESCE(
                        TRY_CAST(total_refund_amount AS DECIMAL(18, 2)),
                        TRY_CAST(amount_refunded AS DECIMAL(18, 2)),
                        TRY_CAST(payment_refund_amount AS DECIMAL(18, 2)) / 100.0,
                        0.0
                    ) AS refund_amount,
                    CAST(created_at AS DATE) AS payment_date,
                    CASE WHEN LOWER(TRIM(CAST(status AS VARCHAR))) IN ('settle', 'settled') THEN 'SETTLED'
                         WHEN LOWER(TRIM(CAST(status AS VARCHAR))) = 'processing' THEN 'PROCESSING'
                         WHEN LOWER(TRIM(CAST(status AS VARCHAR))) = 'refunded' THEN 'REFUNDED'
                         WHEN CAST(status AS VARCHAR) = '1' THEN 'SUCCESS'
                         WHEN CAST(status AS VARCHAR) = '2' THEN 'PROCESSING'
                         WHEN CAST(status AS VARCHAR) = '3' THEN 'SETTLED'
                         WHEN CAST(status AS VARCHAR) = '5' THEN 'REFUNDED'
                         ELSE 'FAILED' END AS status,
                    CAST(status AS VARCHAR) AS source_status,
                    CAST(paid_status AS VARCHAR) AS paid_status
                FROM _batch
            """,
            "date_column": "created_at",
        },
        "service_history_payments": {
            "mysql_table": get_mysql_profile("service_history_payments")["table"],
            "raw_columns": (
                "id, order_id, reg_number, agent_fees, vendor_fee, partner_fee, paid_partner_fee_to_partner, "
                "payment_gateway_fees, payment_refund_amount, amount_refunded, created_at, status"
            ),
            "duckdb_projection": """
                SELECT
                    CAST(id AS VARCHAR) AS id,
                    order_id AS transaction_id,
                    reg_number AS vehicle_number,
                    COALESCE(TRY_CAST(agent_fees AS DECIMAL(18, 2)), 0.0) AS convenience_fee,
                    COALESCE(
                        TRY_CAST(vendor_fee AS DECIMAL(18, 2)),
                        TRY_CAST(partner_fee AS DECIMAL(18, 2)),
                        TRY_CAST(paid_partner_fee_to_partner AS DECIMAL(18, 2)),
                        0.0
                    ) AS vendor_payout,
                    COALESCE(TRY_CAST(payment_gateway_fees AS DECIMAL(18, 2)), 0.0) AS pg_fee,
                    COALESCE(
                        TRY_CAST(amount_refunded AS DECIMAL(18, 2)),
                        TRY_CAST(payment_refund_amount AS DECIMAL(18, 2)),
                        0.0
                    ) AS refund_amount,
                    CAST(created_at AS DATE) AS payment_date,
                    CASE WHEN status = '1' THEN 'SUCCESS'
                         WHEN status = '5' THEN 'REFUNDED'
                         WHEN status = '3' THEN 'ATTEMPT'
                         ELSE 'FAILED' END AS status
                FROM _batch
            """,
            "date_column": "created_at",
        },
        "buy_fastag_payment": {
            "mysql_table": get_mysql_profile("buy_fastag_payment")["table"],
            "raw_columns": (
                "id, order_id, reg_number, total_amount, user_amount, convenience_fees, agent_fees, "
                "payment_gateway_fees, payment_refund_amount, amount_refunded, created_at, payment_status"
            ),
            "duckdb_projection": """
                SELECT
                    CAST(id AS VARCHAR) AS id,
                    order_id,
                    reg_number AS vehicle_number,
                    COALESCE(
                        TRY_CAST(convenience_fees AS DECIMAL(18, 2)),
                        TRY_CAST(total_amount - user_amount AS DECIMAL(18, 2)),
                        0.0
                    ) AS convenience_fee,
                    COALESCE(TRY_CAST(agent_fees AS DECIMAL(18, 2)), 0.0) AS vendor_payout,
                    COALESCE(TRY_CAST(payment_gateway_fees AS DECIMAL(18, 2)), 0.0) AS pg_fee,
                    COALESCE(
                        TRY_CAST(amount_refunded AS DECIMAL(18, 2)),
                        TRY_CAST(payment_refund_amount AS DECIMAL(18, 2)),
                        0.0
                    ) AS refund_amount,
                    CAST(created_at AS DATE) AS payment_date,
                    CASE WHEN payment_status = 'captured' THEN 'SUCCESS'
                         WHEN payment_status = 'refunded' THEN 'REFUNDED'
                         WHEN payment_status = 'failed' THEN 'FAILED'
                         ELSE 'ATTEMPT' END AS status
                FROM _batch
            """,
            "date_column": "created_at",
        },
    }


def run_full_ingestion(steps: list[dict[str, str]] | None = None) -> int:
    if steps is None:
        steps = []

    with db_connect() as conn:
        try:
            mysql_enabled = ensure_mysql_extension(conn, steps)
            aliases = attach_sources(conn, steps, mysql_enabled)
            rows = sync_7_day_window(conn, aliases, steps)
            steps.append({"message": f"Warehouse refresh completed. Ingested {rows} rows.", "status": "success"})
            return rows
        except Exception as exc:
            steps.append({"message": f"Warehouse refresh failed: {exc}", "status": "error"})
            raise
        finally:
            detach_sources(conn)
