import os
import tempfile
from datetime import date
from decimal import Decimal

from app.integrations.api_cache import find_missing_date_ranges


def test_find_missing_date_ranges_returns_full_range_when_nothing_covered() -> None:
    ranges = find_missing_date_ranges(set(), date(2026, 6, 1), date(2026, 6, 3))
    assert ranges == [(date(2026, 6, 1), date(2026, 6, 3))]


def test_find_missing_date_ranges_returns_empty_when_fully_covered() -> None:
    covered = {date(2026, 6, 1), date(2026, 6, 2), date(2026, 6, 3)}
    ranges = find_missing_date_ranges(covered, date(2026, 6, 1), date(2026, 6, 3))
    assert ranges == []


def test_find_missing_date_ranges_collapses_gaps() -> None:
    covered = {date(2026, 6, 2), date(2026, 6, 3)}
    ranges = find_missing_date_ranges(covered, date(2026, 6, 1), date(2026, 6, 5))
    assert ranges == [(date(2026, 6, 1), date(2026, 6, 1)), (date(2026, 6, 4), date(2026, 6, 5))]


def test_google_ads_repository_upsert_is_idempotent_and_deduplicates() -> None:
    with tempfile.TemporaryDirectory() as tmpdir:
        os.environ["ANALYTICS_DUCKDB_PATH"] = os.path.join(tmpdir, "test_analytics.db")
        from app.domains.google_ads.repository import GoogleAdsRepository

        repository = GoogleAdsRepository()
        row = {
            "campaign_date": date(2026, 6, 1),
            "campaign_id": "cmp-1",
            "campaign_name": "Brand Search",
            "platform": "Android",
            "impressions": 1000,
            "clicks": 50,
            "conversions": 10,
            "installs": 8,
            "spend": Decimal("500.00"),
            "cpc": Decimal("10.00"),
            "cpa": Decimal("62.50"),
            "target_cpa": Decimal("60.00"),
            "ctr": Decimal("0.05"),
        }

        repository.upsert_campaign_daily([row])
        updated_row = {**row, "spend": Decimal("600.00")}
        repository.upsert_campaign_daily([updated_row])

        results = repository.fetch_campaign_daily(date(2026, 6, 1), date(2026, 6, 1))
        assert len(results) == 1
        assert results[0].spend == Decimal("600.00")

        repository.mark_synced(date(2026, 6, 1), date(2026, 6, 1), "Android")
        covered = repository.covered_dates(date(2026, 6, 1), date(2026, 6, 1), "Android")
        assert covered == {date(2026, 6, 1)}

        del os.environ["ANALYTICS_DUCKDB_PATH"]
