from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field


class RevenueDailyMetrics(BaseModel):
    transaction_date: date
    convenience_fees: Decimal = Field(default=Decimal("0.0"))
    vendor_payouts: Decimal = Field(default=Decimal("0.0"))
    gateway_fees: Decimal = Field(default=Decimal("0.0"))
    user_refunds: Decimal = Field(default=Decimal("0.0"))
    net_revenue: Decimal = Field(default=Decimal("0.0"))


class ServiceRevenueMetric(BaseModel):
    key: str
    title: str
    description: str
    amount: Decimal = Field(default=Decimal("0.0"))
    record_count: int = 0


class InsuranceRevenueMetric(BaseModel):
    key: str
    title: str
    rate_per_sale: Decimal = Field(default=Decimal("0.0"))
    sale_count: int = 0
    revenue: Decimal = Field(default=Decimal("0.0"))


class PolicybazaarBikeDailyInput(BaseModel):
    report_date: date
    raw_r: int = 0
    raw_l: int = 0
    bike_sale_count: int = Field(ge=0)
    non_saod: int = 0
    saod: int = 0
    crm: int = 0
    non_crm: int = 0
    r2b: Decimal = Field(default=Decimal("0.0"))
    rate_per_sale: Decimal = Field(default=Decimal("200.00"))


class PolicybazaarBikeDailyUpsertRequest(BaseModel):
    source_report_date: date | None = None
    rows: list[PolicybazaarBikeDailyInput]


class PolicybazaarCarDailyInput(BaseModel):
    report_date: date
    raw_r: int = 0
    raw_l: int = 0
    car_sale_count: int = Field(ge=0)
    non_saod: int = 0
    saod: int = 0
    crm: int = 0
    non_crm: int = 0
    r2b: Decimal = Field(default=Decimal("0.0"))
    rate_per_sale: Decimal = Field(default=Decimal("600.00"))


class PolicybazaarCarDailyUpsertRequest(BaseModel):
    source_report_date: date | None = None
    rows: list[PolicybazaarCarDailyInput]


class PolicybazaarCVDailyInput(BaseModel):
    report_date: date
    raw_r: int = 0
    raw_l: int = 0
    cv_sale_count: int = Field(ge=0)
    non_saod: int = 0
    saod: int = 0
    crm: int = 0
    non_crm: int = 0
    r2b: Decimal = Field(default=Decimal("0.0"))
    rate_per_sale: Decimal = Field(default=Decimal("1200.00"))


class PolicybazaarCVDailyUpsertRequest(BaseModel):
    source_report_date: date | None = None
    rows: list[PolicybazaarCVDailyInput]


class BudgetVsActual(BaseModel):
    target_cpa: Decimal
    actual_cpa: Decimal


class DataSources(BaseModel):
    ad_spend: Literal["live", "unavailable"]


class BusinessRevenueReport(BaseModel):
    start_date: date
    end_date: date
    daily_metrics: list[RevenueDailyMetrics]
    service_revenue: list[ServiceRevenueMetric] = Field(default_factory=list)
    insurance_revenue: list[InsuranceRevenueMetric] = Field(default_factory=list)
    total_convenience_fees: Decimal
    total_vendor_payouts: Decimal
    total_gateway_fees: Decimal
    total_user_refunds: Decimal
    total_net_revenue: Decimal
    anomalies_detected: bool
    suggestions: list[str]
    ad_spend_total: Decimal = Field(default=Decimal("0.0"))
    ad_installs_total: int = 0
    ad_clicks_total: int = 0
    previous_total_net_revenue: Decimal = Field(default=Decimal("0.0"))
    previous_total_vendor_payouts: Decimal = Field(default=Decimal("0.0"))
    previous_total_gateway_fees: Decimal = Field(default=Decimal("0.0"))
    previous_total_user_refunds: Decimal = Field(default=Decimal("0.0"))
    previous_total_service_revenue: Decimal = Field(default=Decimal("0.0"))
    previous_total_insurance_revenue: Decimal = Field(default=Decimal("0.0"))
    previous_ad_spend_total: Decimal = Field(default=Decimal("0.0"))
    budget_vs_actual: BudgetVsActual | None = None
    data_sources: DataSources


class RevenueComparison(BaseModel):
    today: date
    yesterday: date
    net_revenue_today: Decimal
    net_revenue_yesterday: Decimal
    percentage_change: Decimal


class SyncStep(BaseModel):
    message: str
    status: Literal["success", "warning", "error"]


class SyncResponse(BaseModel):
    status: Literal["success", "failure"]
    synced_records: int
    steps: list[SyncStep]
