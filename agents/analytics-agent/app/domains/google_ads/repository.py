from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from app.domains.google_ads.schemas import CampaignDailyMetric
from app.integrations.duckdb_client import connect as db_connect

TABLE_DEFINITIONS = [
    """
    CREATE TABLE IF NOT EXISTS google_ads_campaign_daily (
        campaign_date DATE,
        campaign_id VARCHAR,
        campaign_name VARCHAR,
        platform VARCHAR,
        campaign_type VARCHAR DEFAULT '',
        source VARCHAR DEFAULT '',
        status VARCHAR DEFAULT '',
        impressions BIGINT DEFAULT 0,
        clicks BIGINT DEFAULT 0,
        conversions BIGINT DEFAULT 0,
        installs BIGINT DEFAULT 0,
        spend DECIMAL(18, 2) DEFAULT 0,
        cpc DECIMAL(18, 4) DEFAULT 0,
        cpa DECIMAL(18, 4) DEFAULT 0,
        target_cpa DECIMAL(18, 4) DEFAULT 0,
        ctr DECIMAL(10, 6) DEFAULT 0,
        fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (campaign_date, campaign_id, platform)
    );
    """,
    """
    CREATE TABLE IF NOT EXISTS google_ads_sync_log (
        sync_date DATE,
        platform VARCHAR,
        fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (sync_date, platform)
    );
    """,
]

# Idempotent migrations for tables created before the dimension columns existed.
MIGRATIONS = [
    "ALTER TABLE google_ads_campaign_daily ADD COLUMN IF NOT EXISTS campaign_type VARCHAR DEFAULT '';",
    "ALTER TABLE google_ads_campaign_daily ADD COLUMN IF NOT EXISTS source VARCHAR DEFAULT '';",
    "ALTER TABLE google_ads_campaign_daily ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT '';",
]

ALL_PLATFORMS_SENTINEL = "ALL"

# Whitelist of columns that may be grouped on, to keep dimension names out of raw SQL injection range.
DIMENSION_COLUMNS = {
    "platform": "platform",
    "campaign_type": "campaign_type",
    "source": "source",
    "status": "status",
}


class GoogleAdsRepository:
    def __init__(self) -> None:
        with db_connect() as conn:
            for statement in TABLE_DEFINITIONS:
                conn.execute(statement)
            for statement in MIGRATIONS:
                conn.execute(statement)

    def covered_dates(self, start_date: date, end_date: date, platform: str | None) -> set[date]:
        sync_key = platform or ALL_PLATFORMS_SENTINEL
        with db_connect() as conn:
            rows = conn.execute(
                """
                SELECT sync_date FROM google_ads_sync_log
                WHERE sync_date BETWEEN ? AND ?
                AND platform IN (?, ?);
                """,
                [start_date, end_date, sync_key, ALL_PLATFORMS_SENTINEL],
            ).fetchall()
        return {row[0] for row in rows}

    def mark_synced(self, start_date: date, end_date: date, platform: str | None) -> None:
        sync_key = platform or ALL_PLATFORMS_SENTINEL
        dates = []
        current = start_date
        while current <= end_date:
            dates.append(current)
            current += timedelta(days=1)

        with db_connect() as conn:
            for sync_date in dates:
                conn.execute(
                    """
                    INSERT INTO google_ads_sync_log (sync_date, platform, fetched_at)
                    VALUES (?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT (sync_date, platform) DO UPDATE SET fetched_at = now();
                    """,
                    [sync_date, sync_key],
                )

    def upsert_campaign_daily(self, rows: list[dict[str, Any]]) -> int:
        if not rows:
            return 0

        with db_connect() as conn:
            for row in rows:
                conn.execute(
                    """
                    INSERT INTO google_ads_campaign_daily (
                        campaign_date, campaign_id, campaign_name, platform,
                        campaign_type, source, status,
                        impressions, clicks, conversions, installs,
                        spend, cpc, cpa, target_cpa, ctr, fetched_at
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT (campaign_date, campaign_id, platform) DO UPDATE SET
                        campaign_name = EXCLUDED.campaign_name,
                        campaign_type = EXCLUDED.campaign_type,
                        source = EXCLUDED.source,
                        status = EXCLUDED.status,
                        impressions = EXCLUDED.impressions,
                        clicks = EXCLUDED.clicks,
                        conversions = EXCLUDED.conversions,
                        installs = EXCLUDED.installs,
                        spend = EXCLUDED.spend,
                        cpc = EXCLUDED.cpc,
                        cpa = EXCLUDED.cpa,
                        target_cpa = EXCLUDED.target_cpa,
                        ctr = EXCLUDED.ctr,
                        fetched_at = now();
                    """,
                    [
                        row["campaign_date"],
                        row["campaign_id"],
                        row["campaign_name"],
                        row["platform"],
                        row.get("campaign_type", ""),
                        row.get("source", ""),
                        row.get("status", ""),
                        row["impressions"],
                        row["clicks"],
                        row["conversions"],
                        row["installs"],
                        row["spend"],
                        row["cpc"],
                        row["cpa"],
                        row["target_cpa"],
                        row["ctr"],
                    ],
                )
        return len(rows)

    def fetch_campaign_daily(
        self,
        start_date: date,
        end_date: date,
        platform: str | None = None,
    ) -> list[CampaignDailyMetric]:
        query = """
            SELECT campaign_date, campaign_id, campaign_name, platform,
                   campaign_type, source, status,
                   impressions, clicks, conversions, installs,
                   spend, cpc, cpa, target_cpa, ctr
            FROM google_ads_campaign_daily
            WHERE campaign_date BETWEEN ? AND ?
        """
        params: list[Any] = [start_date, end_date]
        if platform:
            query += " AND platform = ?"
            params.append(platform)
        query += " ORDER BY campaign_date ASC;"

        with db_connect() as conn:
            rows = conn.execute(query, params).fetchall()

        return [
            CampaignDailyMetric(
                campaign_date=row[0],
                campaign_id=row[1],
                campaign_name=row[2],
                platform=row[3],
                campaign_type=row[4] or "",
                source=row[5] or "",
                status=row[6] or "",
                impressions=row[7] or 0,
                clicks=row[8] or 0,
                conversions=row[9] or 0,
                installs=row[10] or 0,
                spend=row[11] or Decimal("0.0"),
                cpc=row[12] or Decimal("0.0"),
                cpa=row[13] or Decimal("0.0"),
                target_cpa=row[14] or Decimal("0.0"),
                ctr=row[15] or Decimal("0.0"),
            )
            for row in rows
        ]

    # ------------------------------------------------------------------
    # Aggregations for analytics. All return base sums; derived metrics
    # (CPA/CPI/CTR/...) are computed in the service layer for consistency.
    # The SUM(target_cpa * spend) column is the numerator for a spend-weighted
    # target CPA (divide by SUM(spend) in the service).
    # ------------------------------------------------------------------
    _SUM_COLUMNS = """
        COALESCE(SUM(spend), 0) AS spend,
        COALESCE(SUM(impressions), 0) AS impressions,
        COALESCE(SUM(clicks), 0) AS clicks,
        COALESCE(SUM(conversions), 0) AS conversions,
        COALESCE(SUM(installs), 0) AS installs,
        COALESCE(SUM(target_cpa * spend), 0) AS weighted_target_num,
        COALESCE(SUM(CASE WHEN target_cpa > 0 THEN spend ELSE 0 END), 0) AS targeted_spend,
        COALESCE(SUM(CASE WHEN target_cpa > 0 THEN conversions ELSE 0 END), 0) AS targeted_conversions
    """

    def _where(self, start_date: date, end_date: date, platform: str | None) -> tuple[str, list[Any]]:
        clause = "WHERE campaign_date BETWEEN ? AND ?"
        params: list[Any] = [start_date, end_date]
        if platform:
            clause += " AND platform = ?"
            params.append(platform)
        return clause, params

    def aggregate_totals(self, start_date: date, end_date: date, platform: str | None = None) -> dict[str, Any]:
        clause, params = self._where(start_date, end_date, platform)
        with db_connect() as conn:
            row = conn.execute(
                f"SELECT {self._SUM_COLUMNS} FROM google_ads_campaign_daily {clause};",
                params,
            ).fetchone()
        return _sum_row_to_dict(row)

    def aggregate_time_series(
        self, start_date: date, end_date: date, platform: str | None = None
    ) -> list[dict[str, Any]]:
        clause, params = self._where(start_date, end_date, platform)
        with db_connect() as conn:
            rows = conn.execute(
                f"""
                SELECT campaign_date, {self._SUM_COLUMNS}
                FROM google_ads_campaign_daily {clause}
                GROUP BY campaign_date ORDER BY campaign_date ASC;
                """,
                params,
            ).fetchall()
        return [{"date": row[0], **_sum_row_to_dict(row[1:])} for row in rows]

    def aggregate_by_dimension(
        self, dimension: str, start_date: date, end_date: date, platform: str | None = None
    ) -> list[dict[str, Any]]:
        column = DIMENSION_COLUMNS.get(dimension)
        if column is None:
            raise ValueError(f"Unsupported dimension: {dimension}")
        clause, params = self._where(start_date, end_date, platform)
        with db_connect() as conn:
            rows = conn.execute(
                f"""
                SELECT COALESCE(NULLIF({column}, ''), 'Unknown') AS dim, {self._SUM_COLUMNS}
                FROM google_ads_campaign_daily {clause}
                GROUP BY dim ORDER BY spend DESC;
                """,
                params,
            ).fetchall()
        return [{"dimension": row[0], **_sum_row_to_dict(row[1:])} for row in rows]

    def aggregate_top_campaigns(
        self, start_date: date, end_date: date, platform: str | None = None, limit: int = 10
    ) -> list[dict[str, Any]]:
        clause, params = self._where(start_date, end_date, platform)
        with db_connect() as conn:
            rows = conn.execute(
                f"""
                SELECT campaign_id,
                       ANY_VALUE(campaign_name) AS campaign_name,
                       ANY_VALUE(platform) AS platform,
                       ANY_VALUE(campaign_type) AS campaign_type,
                       ANY_VALUE(status) AS status,
                       {self._SUM_COLUMNS}
                FROM google_ads_campaign_daily {clause}
                GROUP BY campaign_id ORDER BY spend DESC LIMIT ?;
                """,
                [*params, limit],
            ).fetchall()
        return [
            {
                "campaign_id": row[0],
                "campaign_name": row[1] or "",
                "platform": row[2] or "",
                "campaign_type": row[3] or "",
                "status": row[4] or "",
                **_sum_row_to_dict(row[5:]),
            }
            for row in rows
        ]


def _sum_row_to_dict(row: Any) -> dict[str, Any]:
    return {
        "spend": float(row[0] or 0),
        "impressions": int(row[1] or 0),
        "clicks": int(row[2] or 0),
        "conversions": int(row[3] or 0),
        "installs": int(row[4] or 0),
        "weighted_target_num": float(row[5] or 0),
        "targeted_spend": float(row[6] or 0),
        "targeted_conversions": int(row[7] or 0),
    }
