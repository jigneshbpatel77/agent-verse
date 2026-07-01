from fastapi import APIRouter, HTTPException, Query, status

from app.config.settings import get_settings
from app.domains.firebase.funnel_store import FunnelStore
from app.domains.firebase.schemas import (
    FirebaseAnalyticsSummary,
    FirebaseConfigStatus,
    FirebaseCrashlyticsReportsResponse,
    FirebaseEventCatalogResponse,
    FirebaseOverviewResponse,
    FunnelDefinitionCreate,
    FunnelDefinitionItem,
    FunnelDefinitionList,
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


@router.get("/funnels/events", response_model=FirebaseEventCatalogResponse)
def firebase_funnel_events(
    days: int = Query(default=30, ge=1, le=90),
    limit: int = Query(default=500, ge=1, le=5000),
    start_date: str | None = Query(default=None, description="YYYY-MM-DD; overrides days when paired with end_date"),
    end_date: str | None = Query(default=None, description="YYYY-MM-DD; overrides days when paired with start_date"),
) -> FirebaseEventCatalogResponse:
    try:
        return FirebaseService(get_settings()).list_events(
            days=days, limit=limit, start_date=start_date, end_date=end_date
        )
    except FirebaseConfigError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except FirebaseApiError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc


@router.get("/funnels", response_model=FunnelDefinitionList)
def list_funnels() -> FunnelDefinitionList:
    return FunnelDefinitionList(funnels=FunnelStore().list_funnels())


@router.post("/funnels", response_model=FunnelDefinitionItem, status_code=status.HTTP_201_CREATED)
def create_funnel(body: FunnelDefinitionCreate) -> FunnelDefinitionItem:
    if not body.name.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Funnel name is required")
    if len(body.events) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A funnel needs at least 2 steps")
    return FunnelStore().create(body.name.strip(), body.events)


@router.delete("/funnels/{funnel_id}")
def delete_funnel(funnel_id: str) -> dict[str, str]:
    FunnelStore().delete(funnel_id)
    return {"status": "deleted", "id": funnel_id}


@router.get("/crashlytics/releases", response_model=FirebaseCrashlyticsReportsResponse)
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
