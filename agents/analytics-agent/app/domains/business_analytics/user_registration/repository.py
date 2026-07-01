"""Read-only aggregations over the user_registration_events warehouse table.

All metrics are computed in DuckDB; the service/route layer only shapes the response.
Returns aggregates only — never raw PII.
"""
from __future__ import annotations

from datetime import date
from typing import Any

from app.domains.business_analytics.user_registration.pipeline import WAREHOUSE_DDL, WAREHOUSE_TABLE
from app.integrations.duckdb_client import connect as db_connect

_DIMENSIONS = {
    "source": "source",
    "platform": "platform",
    "version_code": "version_code",
}


class UserAnalyticsRepository:
    def __init__(self) -> None:
        with db_connect() as conn:
            conn.execute(WAREHOUSE_DDL)

    def _where(self, start_date: date | None, end_date: date | None) -> tuple[str, list[Any]]:
        clauses: list[str] = []
        params: list[Any] = []
        if start_date is not None:
            clauses.append("registered_date >= ?")
            params.append(start_date)
        if end_date is not None:
            clauses.append("registered_date <= ?")
            params.append(end_date)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        return where, params

    def overview(self, start_date: date | None, end_date: date | None) -> dict[str, Any]:
        where, params = self._where(start_date, end_date)
        with db_connect() as conn:
            row = conn.execute(
                f"""
                SELECT
                    COUNT(*) AS total_users,
                    COUNT(DISTINCT NULLIF(source, '')) AS distinct_sources,
                    COUNT(DISTINCT NULLIF(platform, '')) AS distinct_platforms,
                    SUM(CASE WHEN last_login IS NOT NULL THEN 1 ELSE 0 END) AS logged_in,
                    SUM(CASE WHEN last_login IS NULL THEN 1 ELSE 0 END) AS never_logged_in,
                    SUM(CASE WHEN has_fcm_token THEN 1 ELSE 0 END) AS push_reachable,
                    SUM(CASE WHEN has_mobile THEN 1 ELSE 0 END) AS mobile_provided,
                    SUM(CASE WHEN COALESCE(is_mobile_verification_pending, 0) = 0 THEN 1 ELSE 0 END) AS verified,
                    SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) AS soft_deleted
                FROM {WAREHOUSE_TABLE} {where};
                """,
                params,
            ).fetchone()

        total = int(row[0] or 0)

        def pct(n: int) -> float:
            return round(100.0 * n / total, 1) if total else 0.0

        return {
            "total_users": total,
            "distinct_sources": int(row[1] or 0),
            "distinct_platforms": int(row[2] or 0),
            "logged_in": int(row[3] or 0),
            "never_logged_in": int(row[4] or 0),
            "activation_rate_pct": pct(int(row[3] or 0)),
            "never_logged_in_pct": pct(int(row[4] or 0)),
            "push_reachable_pct": pct(int(row[5] or 0)),
            "mobile_provided_pct": pct(int(row[6] or 0)),
            "verified_pct": pct(int(row[7] or 0)),
            "soft_deleted": int(row[8] or 0),
        }

    def by_dimension(self, dimension: str, start_date: date | None, end_date: date | None) -> list[dict[str, Any]]:
        column = _DIMENSIONS.get(dimension)
        if column is None:
            raise ValueError(f"Unsupported dimension: {dimension}")
        where, params = self._where(start_date, end_date)
        with db_connect() as conn:
            rows = conn.execute(
                f"""
                SELECT
                    COALESCE(NULLIF(TRIM({column}), ''), '(unknown)') AS label,
                    COUNT(*) AS users,
                    SUM(CASE WHEN last_login IS NOT NULL THEN 1 ELSE 0 END) AS activated
                FROM {WAREHOUSE_TABLE} {where}
                GROUP BY 1 ORDER BY users DESC;
                """,
                params,
            ).fetchall()
        total = sum(int(r[1]) for r in rows) or 0
        return [
            {
                "label": r[0],
                "users": int(r[1]),
                "pct": round(100.0 * int(r[1]) / total, 1) if total else 0.0,
                "activation_rate_pct": round(100.0 * int(r[2]) / int(r[1]), 1) if int(r[1]) else 0.0,
            }
            for r in rows
        ]

    def signups_daily(self, start_date: date | None, end_date: date | None) -> list[dict[str, Any]]:
        where, params = self._where(start_date, end_date)
        with db_connect() as conn:
            rows = conn.execute(
                f"""
                SELECT registered_date AS day, COUNT(*) AS signups
                FROM {WAREHOUSE_TABLE} {where}
                GROUP BY 1 ORDER BY 1 ASC;
                """,
                params,
            ).fetchall()
        return [{"day": r[0], "signups": int(r[1])} for r in rows]

    def lifecycle(self, start_date: date | None, end_date: date | None) -> list[dict[str, Any]]:
        where, params = self._where(start_date, end_date)
        with db_connect() as conn:
            rows = conn.execute(
                f"""
                SELECT lifecycle, COUNT(*) AS users FROM (
                    SELECT CASE
                        WHEN deleted_at IS NOT NULL THEN 'Churned (soft-deleted)'
                        WHEN last_login IS NULL THEN 'Registered, never logged in'
                        WHEN date_diff('day', CAST(last_login AS DATE), CURRENT_DATE) <= 7 THEN 'Active (<=7d)'
                        WHEN date_diff('day', CAST(last_login AS DATE), CURRENT_DATE) <= 30 THEN 'Engaged (8-30d)'
                        ELSE 'Dormant (>30d)' END AS lifecycle
                    FROM {WAREHOUSE_TABLE} {where}
                ) GROUP BY 1 ORDER BY users DESC;
                """,
                params,
            ).fetchall()
        total = sum(int(r[1]) for r in rows) or 0
        return [
            {"label": r[0], "users": int(r[1]), "pct": round(100.0 * int(r[1]) / total, 1) if total else 0.0}
            for r in rows
        ]
