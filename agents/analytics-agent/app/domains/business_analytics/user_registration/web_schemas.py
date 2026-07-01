"""Response models for the user-registration analytics API."""
from __future__ import annotations

from datetime import date

from pydantic import BaseModel


class UserOverview(BaseModel):
    total_users: int
    distinct_sources: int
    distinct_platforms: int
    logged_in: int
    never_logged_in: int
    activation_rate_pct: float
    never_logged_in_pct: float
    push_reachable_pct: float
    mobile_provided_pct: float
    verified_pct: float
    soft_deleted: int


class DimensionSlice(BaseModel):
    label: str
    users: int
    pct: float
    activation_rate_pct: float = 0.0


class DailyPoint(BaseModel):
    day: date
    signups: int


class LifecycleSlice(BaseModel):
    label: str
    users: int
    pct: float


class UserSyncResponse(BaseModel):
    status: str
    source: str
    fetched_rows: int
    persisted_rows: int
    schema_ok: bool
    missing_required: list[str]
    missing_optional: list[str]
    unexpected_columns: list[str]
    overview: UserOverview
    steps: list[dict]


class UserAnalyticsSummary(BaseModel):
    start_date: date | None
    end_date: date | None
    data_source: str
    overview: UserOverview
    by_source: list[DimensionSlice]
    by_platform: list[DimensionSlice]
    by_version: list[DimensionSlice]
    signups_daily: list[DailyPoint]
    lifecycle: list[LifecycleSlice]
