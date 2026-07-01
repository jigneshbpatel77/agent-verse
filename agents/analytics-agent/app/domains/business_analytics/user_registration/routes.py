"""User-registration analytics API (read-only, aggregates only)."""
from __future__ import annotations

from datetime import date

from fastapi import APIRouter, HTTPException, Query

from app.config.settings import get_settings
from app.domains.business_analytics.user_registration import pipeline
from app.domains.business_analytics.user_registration.repository import UserAnalyticsRepository
from app.domains.business_analytics.user_registration.web_schemas import (
    DailyPoint,
    DimensionSlice,
    LifecycleSlice,
    UserAnalyticsSummary,
    UserOverview,
    UserSyncResponse,
)

router = APIRouter()


@router.post("/sync", response_model=UserSyncResponse)
def sync_user_registration() -> UserSyncResponse:
    """Fetch from the configured source (RDS by default) into the warehouse, then report.

    Runs on the API host so a VPC/VPN-connected backend can reach the private RC replica.
    """
    try:
        result = pipeline.ingest()
    except Exception as exc:
        # Connection/auth failures (already password-redacted) surface as a bad-gateway.
        raise HTTPException(status_code=502, detail=f"User registration sync failed: {exc}") from exc

    validation = result["validation"]
    overview = UserAnalyticsRepository().overview(None, None)
    return UserSyncResponse(
        status="success",
        source=result["source"],
        fetched_rows=result["fetched_rows"],
        persisted_rows=result["persisted_rows"],
        schema_ok=validation.ok,
        missing_required=validation.missing_required,
        missing_optional=validation.missing_optional,
        unexpected_columns=validation.unexpected,
        overview=UserOverview(**overview),
        steps=result["steps"],
    )


@router.get("/summary", response_model=UserAnalyticsSummary)
def get_user_analytics_summary(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
) -> UserAnalyticsSummary:
    if start_date and end_date and start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date must be before or equal to end_date")

    try:
        repo = UserAnalyticsRepository()
        return UserAnalyticsSummary(
            start_date=start_date,
            end_date=end_date,
            data_source=get_settings().user_registration_data_source,
            overview=UserOverview(**repo.overview(start_date, end_date)),
            by_source=[DimensionSlice(**r) for r in repo.by_dimension("source", start_date, end_date)],
            by_platform=[DimensionSlice(**r) for r in repo.by_dimension("platform", start_date, end_date)],
            by_version=[DimensionSlice(**r) for r in repo.by_dimension("version_code", start_date, end_date)],
            signups_daily=[DailyPoint(**r) for r in repo.signups_daily(start_date, end_date)],
            lifecycle=[LifecycleSlice(**r) for r in repo.lifecycle(start_date, end_date)],
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"User analytics aggregation failed: {exc}") from exc
