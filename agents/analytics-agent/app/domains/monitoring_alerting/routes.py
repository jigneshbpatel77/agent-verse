from typing import Any

from fastapi import APIRouter, HTTPException, Request

from app.config.settings import get_settings
from app.domains.monitoring_alerting.alerts import AlertDispatcher
from app.domains.monitoring_alerting.llm_analyzer import LLMAnalyzer
from app.domains.monitoring_alerting.schemas import (
    AnalysisRequest,
    AnalysisResult,
    LogEvent,
    PollRequest,
    PollResult,
)
from app.domains.monitoring_alerting.subscription import decode_cloudwatch_subscription
from app.domains.monitoring_alerting.worker import MonitoringWorker

router = APIRouter()


@router.post("/analyze", response_model=AnalysisResult)
def analyze(request: AnalysisRequest) -> AnalysisResult:
    settings = get_settings()
    try:
        analyzer = LLMAnalyzer(settings)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    events = [LogEvent(source=request.source, message=message) for message in request.messages]
    result = analyzer.analyze(request.source, events)
    AlertDispatcher(settings).dispatch_if_needed(result)
    return result


@router.get("/cloudwatch/log-groups", response_model=list[str])
def configured_log_groups() -> list[str]:
    settings = get_settings()
    return settings.cloudwatch_log_groups


@router.post("/cloudwatch/poll", response_model=PollResult)
async def poll_cloudwatch(request: Request, poll_request: PollRequest | None = None) -> PollResult:
    settings = get_settings()
    if not settings.cloudwatch_log_groups:
        raise HTTPException(status_code=400, detail="No CloudWatch log groups configured")

    requested_log_groups = poll_request.log_groups if poll_request else None
    if requested_log_groups:
        configured = set(settings.cloudwatch_log_groups)
        unknown = [group for group in requested_log_groups if group not in configured]
        if unknown:
            raise HTTPException(
                status_code=400,
                detail="Requested log groups are not in the configured allowlist: "
                + ", ".join(unknown),
            )

    if request.app.state.monitoring_worker is None:
        try:
            request.app.state.monitoring_worker = MonitoringWorker.from_settings(settings)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        return await request.app.state.monitoring_worker.poll_once(requested_log_groups)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/cloudwatch/subscription", response_model=AnalysisResult)
def ingest_cloudwatch_subscription(payload: dict[str, Any]) -> AnalysisResult:
    settings = get_settings()
    try:
        events = decode_cloudwatch_subscription(payload)
        analyzer = LLMAnalyzer(settings)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    result = analyzer.analyze("cloudwatch-subscription", events)
    AlertDispatcher(settings).dispatch_if_needed(result)
    return result
