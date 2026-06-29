from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class FirebaseConfigStatus(BaseModel):
    project_id: str | None = None
    ga4_property_id: str | None = None
    android_app_id: str | None = None
    service_account_configured: bool
    missing: list[str] = Field(default_factory=list)


class FirebaseAnalyticsMetric(BaseModel):
    name: str
    value: float


class FirebaseAnalyticsDailyRow(BaseModel):
    date: str
    metrics: dict[str, float]


class FirebaseAnalyticsDimensionRow(BaseModel):
    dimension: str
    metrics: dict[str, float]


class FirebaseAnalyticsBreakdown(BaseModel):
    name: str
    dimension: str
    rows: list[FirebaseAnalyticsDimensionRow] = Field(default_factory=list)


class FirebaseAnalyticsSummary(BaseModel):
    project_id: str
    property_id: str
    days: int
    generated_at: datetime
    totals: list[FirebaseAnalyticsMetric]
    daily: list[FirebaseAnalyticsDailyRow]
    breakdowns: list[FirebaseAnalyticsBreakdown] = Field(default_factory=list)


class FirebaseCrashlyticsReport(BaseModel):
    name: str
    display_name: str | None = None
    type: str | None = None
    raw: dict[str, Any] = Field(default_factory=dict)


class FirebaseCrashlyticsReportsResponse(BaseModel):
    project_id: str
    app_id: str
    generated_at: datetime
    reports: list[FirebaseCrashlyticsReport]


class FirebaseOverviewResponse(BaseModel):
    config: FirebaseConfigStatus
    analytics: FirebaseAnalyticsSummary | None = None
    crashlytics: FirebaseCrashlyticsReportsResponse | None = None
    errors: list[str] = Field(default_factory=list)
