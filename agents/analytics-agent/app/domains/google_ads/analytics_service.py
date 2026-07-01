from datetime import date, timedelta
from typing import Any

from app.domains.google_ads.repository import GoogleAdsRepository
from app.domains.google_ads.schemas import (
    AnalyticsInsight,
    CampaignAnalyticsReport,
    CampaignSlice,
    DimensionSlice,
    MetricBlock,
    TimeSeriesPoint,
)
from app.domains.google_ads.service import GoogleAdsCacheService

# Thresholds for the rule-based insight engine.
_OVER_TARGET_RATIO = 1.2  # actual CPA more than 20% over target => overspending
_CONCENTRATION_SHARE = 40.0  # single campaign holding >40% of spend => concentration risk
_MIN_SPEND_FOR_FLAG = 1000.0  # ignore tiny campaigns when flagging waste/overspend


class GoogleAdsAnalyticsService:
    """Turns cached campaign-daily rows into an analyst-grade, multi-dimensional report."""

    def __init__(self, repository: GoogleAdsRepository, cache_service: GoogleAdsCacheService) -> None:
        self.repository = repository
        self.cache_service = cache_service

    def build_report(
        self,
        start_date: date,
        end_date: date,
        platform: str | None = None,
    ) -> CampaignAnalyticsReport:
        period_days = (end_date - start_date).days + 1
        previous_end = start_date - timedelta(days=1)
        previous_start = previous_end - timedelta(days=period_days - 1)

        # Ensure both periods are cached (self-populating; only calls the API for missing days).
        self.cache_service.get_campaign_daily(start_date, end_date, platform)
        self.cache_service.get_campaign_daily(previous_start, previous_end, platform)

        totals = _metric_block(self.repository.aggregate_totals(start_date, end_date, platform))
        previous_totals = _metric_block(self.repository.aggregate_totals(previous_start, previous_end, platform))
        total_spend = totals.spend

        time_series = [
            TimeSeriesPoint(date=point["date"], **_metric_block(point).model_dump())
            for point in self.repository.aggregate_time_series(start_date, end_date, platform)
        ]

        def slices(dimension: str) -> list[DimensionSlice]:
            return [
                DimensionSlice(
                    dimension=row["dimension"],
                    spend_share=_pct(row["spend"], total_spend),
                    **_metric_block(row).model_dump(),
                )
                for row in self.repository.aggregate_by_dimension(dimension, start_date, end_date, platform)
            ]

        top_campaigns = [
            CampaignSlice(
                campaign_id=row["campaign_id"],
                campaign_name=row["campaign_name"],
                platform=row["platform"],
                campaign_type=row["campaign_type"],
                status=row["status"],
                spend_share=_pct(row["spend"], total_spend),
                **_metric_block(row).model_dump(),
            )
            for row in self.repository.aggregate_top_campaigns(start_date, end_date, platform, limit=10)
        ]

        return CampaignAnalyticsReport(
            start_date=start_date,
            end_date=end_date,
            platform=platform,
            previous_start_date=previous_start,
            previous_end_date=previous_end,
            totals=totals,
            previous_totals=previous_totals,
            deltas=_deltas(totals, previous_totals),
            time_series=time_series,
            by_platform=slices("platform"),
            by_campaign_type=slices("campaign_type"),
            by_source=slices("source"),
            by_status=slices("status"),
            top_campaigns=top_campaigns,
            insights=_build_insights(totals, top_campaigns),
            data_source="live" if total_spend > 0 else "unavailable",
        )


def _metric_block(sums: dict[str, Any]) -> MetricBlock:
    spend = float(sums.get("spend", 0) or 0)
    impressions = int(sums.get("impressions", 0) or 0)
    clicks = int(sums.get("clicks", 0) or 0)
    conversions = int(sums.get("conversions", 0) or 0)
    installs = int(sums.get("installs", 0) or 0)
    weighted_target_num = float(sums.get("weighted_target_num", 0) or 0)
    targeted_spend = float(sums.get("targeted_spend", 0) or 0)
    targeted_conversions = int(sums.get("targeted_conversions", 0) or 0)

    # Target CPA is a spend-weighted average over only the spend that has a target set,
    # otherwise campaigns with no target (e.g. conversion-value campaigns) would dilute it to ~0.
    target_cpa = _safe_div(weighted_target_num, targeted_spend)
    # Efficiency compares like-for-like: actual CPA of the targeted campaigns vs their target,
    # not the blended CPA (which mixes app-install and web-conversion campaigns).
    targeted_cpa = _safe_div(targeted_spend, targeted_conversions)
    cpa = _safe_div(spend, conversions)
    return MetricBlock(
        spend=round(spend, 2),
        impressions=impressions,
        clicks=clicks,
        conversions=conversions,
        installs=installs,
        ctr=round(_safe_div(clicks, impressions) * 100, 2),
        cvr=round(_safe_div(conversions, clicks) * 100, 2),
        cpc=round(_safe_div(spend, clicks), 2),
        cpm=round(_safe_div(spend, impressions) * 1000, 2),
        cpi=round(_safe_div(spend, installs), 2),
        cpa=round(cpa, 2),
        target_cpa=round(target_cpa, 2),
        cpa_efficiency=round(_safe_div(targeted_cpa, target_cpa), 2),
    )


def _build_insights(totals: MetricBlock, top_campaigns: list[CampaignSlice]) -> list[AnalyticsInsight]:
    insights: list[AnalyticsInsight] = []

    # Blended efficiency vs target.
    if totals.target_cpa > 0 and totals.cpa_efficiency > _OVER_TARGET_RATIO:
        insights.append(
            AnalyticsInsight(
                severity="critical",
                code="blended_cpa_over_target",
                message=(
                    f"Blended CPA ₹{totals.cpa:,.2f} is {((totals.cpa_efficiency - 1) * 100):.0f}% above "
                    f"the target CPA ₹{totals.target_cpa:,.2f}."
                ),
            )
        )
    elif totals.target_cpa > 0 and totals.cpa_efficiency <= 1:
        insights.append(
            AnalyticsInsight(
                severity="info",
                code="blended_cpa_within_target",
                message=(
                    f"Blended CPA ₹{totals.cpa:,.2f} is within the target CPA ₹{totals.target_cpa:,.2f} "
                    "— acquisition efficiency is healthy."
                ),
            )
        )

    # Spend concentration (Pareto).
    if top_campaigns and top_campaigns[0].spend_share > _CONCENTRATION_SHARE:
        leader = top_campaigns[0]
        insights.append(
            AnalyticsInsight(
                severity="warning",
                code="spend_concentration",
                message=(
                    f"{leader.spend_share:.0f}% of total spend is concentrated in a single campaign "
                    f"(\"{leader.campaign_name}\"). Diversification reduces risk."
                ),
            )
        )

    # Wasted spend: meaningful spend with zero conversions.
    wasted = [c for c in top_campaigns if c.spend >= _MIN_SPEND_FOR_FLAG and c.conversions == 0]
    if wasted:
        wasted_total = sum(c.spend for c in wasted)
        insights.append(
            AnalyticsInsight(
                severity="warning",
                code="wasted_spend",
                message=(
                    f"₹{wasted_total:,.0f} spent across {len(wasted)} campaign(s) with zero conversions "
                    "— candidates to pause or rework."
                ),
            )
        )

    # Overspending campaigns vs their own target.
    overspending = [
        c
        for c in top_campaigns
        if c.spend >= _MIN_SPEND_FOR_FLAG and c.target_cpa > 0 and c.cpa_efficiency > _OVER_TARGET_RATIO
    ]
    if overspending:
        insights.append(
            AnalyticsInsight(
                severity="critical",
                code="campaigns_over_target",
                message=(
                    f"{len(overspending)} high-spend campaign(s) are running more than "
                    f"{int((_OVER_TARGET_RATIO - 1) * 100)}% above their target CPA."
                ),
            )
        )

    if not insights:
        insights.append(
            AnalyticsInsight(
                severity="info",
                code="no_signals",
                message="No spend anomalies detected for the selected period.",
            )
        )
    return insights


def _deltas(current: MetricBlock, previous: MetricBlock) -> dict[str, float]:
    metrics = ("spend", "impressions", "clicks", "conversions", "installs", "ctr", "cvr", "cpc", "cpi", "cpa")
    out: dict[str, float] = {}
    for name in metrics:
        cur = float(getattr(current, name))
        prev = float(getattr(previous, name))
        out[name] = round(((cur - prev) / abs(prev)) * 100, 1) if prev else 0.0
    return out


def _safe_div(numerator: float, denominator: float) -> float:
    return numerator / denominator if denominator else 0.0


def _pct(part: float, whole: float) -> float:
    return round((part / whole) * 100, 1) if whole else 0.0
