from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field


class CampaignDailyMetric(BaseModel):
    campaign_date: date
    campaign_id: str
    campaign_name: str
    platform: str
    campaign_type: str = ""
    source: str = ""
    status: str = ""
    impressions: int = 0
    clicks: int = 0
    conversions: int = 0
    installs: int = 0
    spend: Decimal = Field(default=Decimal("0.0"))
    cpc: Decimal = Field(default=Decimal("0.0"))
    cpa: Decimal = Field(default=Decimal("0.0"))
    target_cpa: Decimal = Field(default=Decimal("0.0"))
    ctr: Decimal = Field(default=Decimal("0.0"))


class CampaignDailyResponse(BaseModel):
    start_date: date
    end_date: date
    platform: str | None
    rows: list[CampaignDailyMetric]


class MetricBlock(BaseModel):
    """Base volumes plus analyst-grade derived efficiency metrics for any slice of data."""

    spend: float = 0.0
    impressions: int = 0
    clicks: int = 0
    conversions: int = 0
    installs: int = 0
    # Derived (weighted, not naive averages).
    ctr: float = 0.0  # clicks / impressions, %
    cvr: float = 0.0  # conversions / clicks, %
    cpc: float = 0.0  # spend / clicks
    cpm: float = 0.0  # spend / impressions * 1000
    cpi: float = 0.0  # spend / installs
    cpa: float = 0.0  # spend / conversions
    target_cpa: float = 0.0  # spend-weighted target CPA
    cpa_efficiency: float = 0.0  # actual CPA / target CPA (>1 = over target)


class DimensionSlice(MetricBlock):
    dimension: str
    spend_share: float = 0.0  # % of total spend


class CampaignSlice(MetricBlock):
    campaign_id: str
    campaign_name: str
    platform: str = ""
    campaign_type: str = ""
    status: str = ""
    spend_share: float = 0.0


class TimeSeriesPoint(MetricBlock):
    date: date


class AnalyticsInsight(BaseModel):
    severity: str  # info | warning | critical
    code: str
    message: str


class CampaignAnalyticsReport(BaseModel):
    start_date: date
    end_date: date
    platform: str | None = None
    previous_start_date: date
    previous_end_date: date
    totals: MetricBlock
    previous_totals: MetricBlock
    deltas: dict[str, float]  # % change vs previous period, by metric name
    time_series: list[TimeSeriesPoint]
    by_platform: list[DimensionSlice]
    by_campaign_type: list[DimensionSlice]
    by_source: list[DimensionSlice]
    by_status: list[DimensionSlice]
    top_campaigns: list[CampaignSlice]
    insights: list[AnalyticsInsight]
    data_source: str  # "live" | "unavailable"
