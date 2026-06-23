from fastapi import APIRouter, HTTPException, status

from app.domains.system_analytics.rc_service.schemas import MetricDiscoveryResponse, RCHealthResponse, SystemServiceSummary
from app.domains.system_analytics.rc_service.service import RCSystemAnalyticsService
from app.integrations.prometheus_client import PrometheusClientError


router = APIRouter(prefix="/system")


@router.get("/services", response_model=list[SystemServiceSummary])
async def list_system_services() -> list[SystemServiceSummary]:
    return RCSystemAnalyticsService().list_services()


@router.get("/{service_key}/health", response_model=RCHealthResponse)
async def service_health(service_key: str) -> RCHealthResponse:
    try:
        return await RCSystemAnalyticsService().get_health(service_key)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.get("/{service_key}/metrics/discover", response_model=MetricDiscoveryResponse)
async def discover_service_metrics(service_key: str) -> MetricDiscoveryResponse:
    try:
        return await RCSystemAnalyticsService().discover_metrics(service_key)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except PrometheusClientError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
