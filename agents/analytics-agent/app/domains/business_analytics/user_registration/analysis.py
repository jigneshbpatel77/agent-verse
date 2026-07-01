"""Source-agnostic analysis over the canonical user-registration staging table.

Every query runs against the canonical column names produced by the pipeline, so the
numbers are identical whether the rows came from CSV or live RDS. Returns only aggregates
(no raw PII rows). Dependency-free (no pandas).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import duckdb

# Each entry: (title, SQL). `{t}` is the canonical staging/warehouse table name.
_ANALYSES: list[tuple[str, str]] = [
    (
        "Overview",
        "SELECT COUNT(*) AS records, MIN(CAST(created_at AS DATE)) AS oldest_signup, "
        "MAX(CAST(created_at AS DATE)) AS newest_signup, "
        "COUNT(DISTINCT lower(email)) AS distinct_emails FROM {t}",
    ),
    (
        "Signups per day",
        "SELECT CAST(created_at AS DATE) AS day, COUNT(*) AS signups FROM {t} "
        "GROUP BY 1 ORDER BY 1 DESC",
    ),
    (
        "Source attribution",
        "SELECT COALESCE(NULLIF(TRIM(source),''),'(unknown)') AS source, COUNT(*) AS users, "
        "ROUND(100.0*COUNT(*)/SUM(COUNT(*)) OVER (),1) AS pct FROM {t} GROUP BY 1 ORDER BY users DESC",
    ),
    (
        "Platform split",
        "SELECT COALESCE(NULLIF(TRIM(platform),''),'(unknown)') AS platform, COUNT(*) AS users, "
        "ROUND(100.0*COUNT(*)/SUM(COUNT(*)) OVER (),1) AS pct FROM {t} GROUP BY 1 ORDER BY users DESC",
    ),
    (
        "App version distribution",
        "SELECT COALESCE(NULLIF(TRIM(version_code),''),'(unknown)') AS version, COUNT(*) AS users "
        "FROM {t} GROUP BY 1 ORDER BY users DESC",
    ),
    (
        "Account status",
        "SELECT COALESCE(TRY_CAST(status AS INTEGER), -1) AS status, COUNT(*) AS users "
        "FROM {t} GROUP BY 1 ORDER BY users DESC",
    ),
    (
        "Mobile verification pending",
        "SELECT COALESCE(TRY_CAST(is_mobile_verification_pending AS INTEGER), -1) AS pending, "
        "COUNT(*) AS users FROM {t} GROUP BY 1 ORDER BY 1",
    ),
    (
        "Last sync status",
        "SELECT COALESCE(NULLIF(TRIM(last_sync_status),''),'(none)') AS last_sync_status, "
        "COUNT(*) AS users FROM {t} GROUP BY 1 ORDER BY users DESC",
    ),
    (
        "Contactability / data completeness",
        "SELECT "
        "SUM(CASE WHEN NULLIF(TRIM(mobile_number),'') IS NOT NULL THEN 1 ELSE 0 END) AS has_mobile, "
        "SUM(CASE WHEN NULLIF(TRIM(device_id),'') IS NOT NULL THEN 1 ELSE 0 END) AS has_device, "
        "SUM(CASE WHEN NULLIF(TRIM(fcm_token),'') IS NOT NULL THEN 1 ELSE 0 END) AS has_fcm, "
        "SUM(CASE WHEN NULLIF(TRIM(email),'') IS NOT NULL THEN 1 ELSE 0 END) AS has_email, "
        "COUNT(*) AS total FROM {t}",
    ),
    (
        "Engagement: ever logged in",
        "SELECT CASE WHEN TRY_CAST(last_login AS TIMESTAMP) IS NULL THEN 'never_logged_in' "
        "ELSE 'logged_in' END AS bucket, COUNT(*) AS users FROM {t} GROUP BY 1 ORDER BY users DESC",
    ),
    (
        "Recency: days since last login (logged-in users)",
        "SELECT MIN(date_diff('day', CAST(last_login AS DATE), CURRENT_DATE)) AS min_days, "
        "ROUND(AVG(date_diff('day', CAST(last_login AS DATE), CURRENT_DATE)),1) AS avg_days, "
        "MAX(date_diff('day', CAST(last_login AS DATE), CURRENT_DATE)) AS max_days "
        "FROM {t} WHERE TRY_CAST(last_login AS TIMESTAMP) IS NOT NULL",
    ),
    (
        "Lifecycle segments",
        "SELECT CASE "
        "WHEN NULLIF(TRIM(deleted_at),'') IS NOT NULL THEN 'churned (soft-deleted)' "
        "WHEN TRY_CAST(last_login AS TIMESTAMP) IS NULL THEN 'registered, never logged in' "
        "WHEN date_diff('day', CAST(last_login AS DATE), CURRENT_DATE) <= 7 THEN 'active (<=7d)' "
        "WHEN date_diff('day', CAST(last_login AS DATE), CURRENT_DATE) <= 30 THEN 'engaged (8-30d)' "
        "ELSE 'dormant (>30d)' END AS lifecycle, COUNT(*) AS users "
        "FROM {t} GROUP BY 1 ORDER BY users DESC",
    ),
    (
        "Top email domains",
        "SELECT lower(split_part(email,'@',2)) AS domain, COUNT(*) AS users FROM {t} "
        "WHERE email LIKE '%@%' GROUP BY 1 ORDER BY users DESC LIMIT 8",
    ),
]


@dataclass
class AnalysisBlock:
    title: str
    columns: list[str]
    rows: list[tuple[Any, ...]]
    error: str | None = None


def analyze(conn: duckdb.DuckDBPyConnection, table: str) -> list[AnalysisBlock]:
    blocks: list[AnalysisBlock] = []
    for title, sql in _ANALYSES:
        try:
            cur = conn.execute(sql.format(t=table))
            columns = [d[0] for d in cur.description]
            rows = cur.fetchall()
            blocks.append(AnalysisBlock(title=title, columns=columns, rows=rows))
        except Exception as exc:  # a missing optional column shouldn't abort the whole report
            blocks.append(AnalysisBlock(title=title, columns=[], rows=[], error=str(exc)))
    return blocks


def _render(block: AnalysisBlock) -> str:
    if block.error:
        return f"--- {block.title} ---\n(error: {block.error})"
    header = " | ".join(block.columns)
    sep = "-" * len(header)
    lines = [" | ".join("" if v is None else str(v) for v in row) for row in block.rows]
    body = "\n".join(lines) if lines else "(no rows)"
    return f"--- {block.title} ---\n{header}\n{sep}\n{body}"


def format_report(blocks: list[AnalysisBlock]) -> str:
    return "\n\n".join(_render(b) for b in blocks)
