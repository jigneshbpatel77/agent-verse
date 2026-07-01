from datetime import date, datetime

from app.domains.google_ads.client import GoogleAdsApiClient, to_decimal
from app.domains.google_ads.repository import GoogleAdsRepository
from app.domains.google_ads.schemas import CampaignDailyMetric
from app.integrations.api_cache import find_missing_date_ranges


class GoogleAdsCacheService:
    """Serves campaign-daily data from DuckDB, only calling the external API for missing days."""

    def __init__(self, repository: GoogleAdsRepository, client: GoogleAdsApiClient) -> None:
        self.repository = repository
        self.client = client

    def get_campaign_daily(
        self,
        start_date: date,
        end_date: date,
        platform: str | None = None,
    ) -> list[CampaignDailyMetric]:
        covered_dates = self.repository.covered_dates(start_date, end_date, platform)
        missing_ranges = find_missing_date_ranges(covered_dates, start_date, end_date)

        for range_start, range_end in missing_ranges:
            api_rows = self.client.fetch_campaign_daily(range_start, range_end, platform)
            self.repository.upsert_campaign_daily([_to_db_row(row) for row in api_rows])
            self.repository.mark_synced(range_start, range_end, platform)

        return self.repository.fetch_campaign_daily(start_date, end_date, platform)


def _to_db_row(api_row: dict) -> dict:
    return {
        "campaign_date": _parse_date(
            api_row.get("metric_date") or api_row.get("date") or api_row.get("campaign_date")
        ),
        "campaign_id": str(api_row.get("campaign_id") or api_row.get("id") or ""),
        "campaign_name": api_row.get("campaign_name") or "",
        "platform": api_row.get("platform") or "",
        "campaign_type": api_row.get("campaign_type") or "",
        "source": api_row.get("source") or "",
        "status": api_row.get("status") or "",
        "impressions": int(api_row.get("impressions") or 0),
        "clicks": int(api_row.get("clicks") or 0),
        "conversions": int(api_row.get("conversions") or 0),
        "installs": int(api_row.get("installs") or 0),
        "spend": to_decimal(api_row.get("spend")),
        "cpc": to_decimal(api_row.get("cpc")),
        "cpa": to_decimal(api_row.get("cpa")),
        "target_cpa": to_decimal(api_row.get("target_cpa")),
        "ctr": to_decimal(api_row.get("ctr")),
    }


def _parse_date(value: object) -> date:
    if isinstance(value, date):
        return value
    text = str(value)
    for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Unrecognized date format: {value!r}")
