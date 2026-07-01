import os
import tempfile
from datetime import date
from decimal import Decimal

from app.domains.google_ads.analytics_service import _deltas, _metric_block, _pct
from app.domains.google_ads.schemas import MetricBlock


def test_metric_block_derives_weighted_metrics() -> None:
    block = _metric_block(
        {
            "spend": 1000.0,
            "impressions": 100000,
            "clicks": 5000,
            "conversions": 200,
            "installs": 400,
            "weighted_target_num": 4000.0,  # => target_cpa = 4000 / targeted_spend = 4.0
            "targeted_spend": 1000.0,
            "targeted_conversions": 200,
        }
    )
    assert block.ctr == 5.0  # 5000 / 100000 * 100
    assert block.cvr == 4.0  # 200 / 5000 * 100
    assert block.cpc == 0.2  # 1000 / 5000
    assert block.cpm == 10.0  # 1000 / 100000 * 1000
    assert block.cpi == 2.5  # 1000 / 400
    assert block.cpa == 5.0  # 1000 / 200
    assert block.target_cpa == 4.0  # 4000 / 1000 (targeted spend)
    assert block.cpa_efficiency == 1.25  # targeted_cpa (1000/200=5) / target_cpa (4) = 1.25


def test_metric_block_handles_zero_denominators() -> None:
    block = _metric_block({"spend": 0, "impressions": 0, "clicks": 0, "conversions": 0, "installs": 0})
    assert block.ctr == 0.0
    assert block.cpa == 0.0
    assert block.cpa_efficiency == 0.0


def test_pct_and_deltas() -> None:
    assert _pct(25, 100) == 25.0
    assert _pct(5, 0) == 0.0
    current = MetricBlock(spend=150, conversions=15)
    previous = MetricBlock(spend=100, conversions=10)
    deltas = _deltas(current, previous)
    assert deltas["spend"] == 50.0
    assert deltas["conversions"] == 50.0


def test_aggregations_group_by_dimension_and_top_campaigns() -> None:
    with tempfile.TemporaryDirectory() as tmpdir:
        os.environ["ANALYTICS_DUCKDB_PATH"] = os.path.join(tmpdir, "analytics_agg.db")
        from app.domains.google_ads.repository import GoogleAdsRepository

        repository = GoogleAdsRepository()

        def make_row(cid: str, ctype: str, src: str, spend: str, conv: int) -> dict:
            return {
                "campaign_date": date(2026, 6, 1),
                "campaign_id": cid,
                "campaign_name": f"Campaign {cid}",
                "platform": "Android",
                "campaign_type": ctype,
                "source": src,
                "status": "ENABLED",
                "impressions": 1000,
                "clicks": 100,
                "conversions": conv,
                "installs": conv,
                "spend": Decimal(spend),
                "cpc": Decimal("1.0"),
                "cpa": Decimal("1.0"),
                "target_cpa": Decimal("2.0"),
                "ctr": Decimal("0.1"),
            }

        repository.upsert_campaign_daily(
            [
                make_row("c1", "SEARCH", "google_ads_sheet", "800", 80),
                make_row("c2", "DISPLAY", "google_ads_sheet", "150", 10),
                make_row("c3", "SEARCH", "manual", "50", 0),
            ]
        )

        start = end = date(2026, 6, 1)
        totals = repository.aggregate_totals(start, end)
        assert totals["spend"] == 1000.0
        assert totals["conversions"] == 90

        by_type = repository.aggregate_by_dimension("campaign_type", start, end)
        type_spend = {row["dimension"]: row["spend"] for row in by_type}
        assert type_spend == {"SEARCH": 850.0, "DISPLAY": 150.0}

        by_source = repository.aggregate_by_dimension("source", start, end)
        assert {row["dimension"] for row in by_source} == {"google_ads_sheet", "manual"}

        top = repository.aggregate_top_campaigns(start, end, limit=2)
        assert [row["campaign_id"] for row in top] == ["c1", "c2"]  # ordered by spend desc
        assert top[0]["spend"] == 800.0

        series = repository.aggregate_time_series(start, end)
        assert len(series) == 1
        assert series[0]["spend"] == 1000.0

        del os.environ["ANALYTICS_DUCKDB_PATH"]
