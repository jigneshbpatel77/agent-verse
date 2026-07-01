from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, Query

from app.config.settings import get_settings
from app.domains.google_ads.analytics_service import GoogleAdsAnalyticsService
from app.domains.google_ads.client import GoogleAdsApiClient, GoogleAdsApiError, GoogleAdsConfigError
from app.domains.google_ads.repository import GoogleAdsRepository
from app.domains.google_ads.schemas import CampaignAnalyticsReport, CampaignDailyResponse
from app.domains.google_ads.service import GoogleAdsCacheService

router = APIRouter()


@router.get("/campaign-daily", response_model=CampaignDailyResponse)
def get_campaign_daily(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    platform: str | None = Query(default=None),
) -> CampaignDailyResponse:
    resolved_end_date = end_date or date.today()
    resolved_start_date = start_date or (resolved_end_date - timedelta(days=29))

    if resolved_start_date > resolved_end_date:
        raise HTTPException(status_code=400, detail="start_date must be before or equal to end_date")

    try:
        service = GoogleAdsCacheService(GoogleAdsRepository(), GoogleAdsApiClient(get_settings()))
        rows = service.get_campaign_daily(resolved_start_date, resolved_end_date, platform)
        return CampaignDailyResponse(
            start_date=resolved_start_date,
            end_date=resolved_end_date,
            platform=platform,
            rows=rows,
        )
    except GoogleAdsConfigError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except GoogleAdsApiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/analytics", response_model=CampaignAnalyticsReport)
def get_campaign_analytics(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    platform: str | None = Query(default=None),
) -> CampaignAnalyticsReport:
    resolved_end_date = end_date or date.today()
    resolved_start_date = start_date or (resolved_end_date - timedelta(days=29))

    if resolved_start_date > resolved_end_date:
        raise HTTPException(status_code=400, detail="start_date must be before or equal to end_date")

    try:
        repository = GoogleAdsRepository()
        cache_service = GoogleAdsCacheService(repository, GoogleAdsApiClient(get_settings()))
        analytics_service = GoogleAdsAnalyticsService(repository, cache_service)
        return analytics_service.build_report(resolved_start_date, resolved_end_date, platform)
    except GoogleAdsConfigError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except GoogleAdsApiError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
