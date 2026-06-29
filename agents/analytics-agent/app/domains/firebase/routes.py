from fastapi import APIRouter, HTTPException, Query, status

from app.config.settings import get_settings
from app.domains.firebase.schemas import (
    FirebaseAnalyticsSummary,
    FirebaseConfigStatus,
    FirebaseCrashlyticsReportsResponse,
    FirebaseOverviewResponse,
)
from app.domains.firebase.service import FirebaseApiError, FirebaseConfigError, FirebaseService


router = APIRouter()


@router.get("/config", response_model=FirebaseConfigStatus)
def firebase_config() -> FirebaseConfigStatus:
    return FirebaseService(get_settings()).config_status()


@router.get("/analytics/summary", response_model=FirebaseAnalyticsSummary)
def firebase_analytics_summary(days: int = Query(default=7, ge=1, le=90)) -> FirebaseAnalyticsSummary:
    try:
        return FirebaseService(get_settings()).analytics_summary(days)
    except FirebaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except FirebaseApiError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.get("/crashlytics/reports", response_model=FirebaseCrashlyticsReportsResponse)
def firebase_crashlytics_reports(page_size: int = Query(default=20, ge=1, le=100)) -> FirebaseCrashlyticsReportsResponse:
    try:
        return FirebaseService(get_settings()).crashlytics_reports(page_size)
    except FirebaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except FirebaseApiError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.get("/overview", response_model=FirebaseOverviewResponse)
def firebase_overview(days: int = Query(default=7, ge=1, le=90)) -> FirebaseOverviewResponse:
    return FirebaseService(get_settings()).overview(days)
