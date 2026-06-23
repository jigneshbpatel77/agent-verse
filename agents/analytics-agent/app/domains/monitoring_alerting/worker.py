import asyncio
import logging
from contextlib import suppress
from typing import Optional

from app.config.settings import Settings
from app.domains.monitoring_alerting.alerts import AlertDispatcher
from app.domains.monitoring_alerting.cloudwatch import CloudWatchLogReader
from app.domains.monitoring_alerting.llm_analyzer import LLMAnalyzer
from app.domains.monitoring_alerting.schemas import AnalysisResult, PollResult

logger = logging.getLogger(__name__)


class MonitoringWorker:
    def __init__(
        self,
        settings: Settings,
        cloudwatch: CloudWatchLogReader,
        analyzer: LLMAnalyzer,
        alerts: AlertDispatcher,
    ) -> None:
        self._settings = settings
        self._cloudwatch = cloudwatch
        self._analyzer = analyzer
        self._alerts = alerts
        self._seen_event_ids: set[str] = set()
        self._task: Optional[asyncio.Task[None]] = None

    @classmethod
    def from_settings(cls, settings: Settings) -> "MonitoringWorker":
        return cls(
            settings=settings,
            cloudwatch=CloudWatchLogReader(
                region_name=settings.aws_region,
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
                aws_session_token=settings.aws_session_token,
            ),
            analyzer=LLMAnalyzer(settings),
            alerts=AlertDispatcher(settings),
        )

    def start(self) -> None:
        if self._task is None:
            self._task = asyncio.create_task(self._run_loop())

    async def stop(self) -> None:
        if self._task is None:
            return
        self._task.cancel()
        with suppress(asyncio.CancelledError):
            await self._task
        self._task = None

    async def poll_once(self, requested_log_groups: Optional[list[str]] = None) -> PollResult:
        log_groups = self._resolve_log_groups(requested_log_groups)
        if not log_groups:
            raise ValueError("No CloudWatch log groups configured")

        logger.info("Monitoring poll starting: log_groups=%s", log_groups)
        events = await asyncio.to_thread(
            self._cloudwatch.read_recent_events,
            log_groups,
            self._settings.cloudwatch_lookback_minutes,
            self._settings.cloudwatch_filter_pattern,
            self._seen_event_ids,
        )

        analysis: Optional[AnalysisResult] = None
        if events:
            logger.info("Monitoring poll analyzing log batch: event_count=%s", len(events))
            analysis = await asyncio.to_thread(self._analyzer.analyze, "cloudwatch", events)
            alert_sent = await asyncio.to_thread(self._alerts.dispatch_if_needed, analysis)
            logger.info(
                "Monitoring poll analysis complete: highest_severity=%s findings=%s alert_sent=%s",
                analysis.highest_severity,
                len(analysis.findings),
                alert_sent,
            )
        else:
            logger.info("Monitoring poll skipped analysis: no new events")

        return PollResult(
            log_groups=log_groups,
            event_count=len(events),
            analysis=analysis,
        )

    def _resolve_log_groups(self, requested_log_groups: Optional[list[str]]) -> list[str]:
        configured = self._settings.cloudwatch_log_groups
        if not requested_log_groups:
            return configured

        configured_set = set(configured)
        unknown = [group for group in requested_log_groups if group not in configured_set]
        if unknown:
            raise ValueError(
                "Requested log groups are not in the configured allowlist: " + ", ".join(unknown)
            )

        return requested_log_groups

    async def _run_loop(self) -> None:
        while True:
            try:
                await self.poll_once()
            except Exception:
                logger.exception("Monitoring alerting poll failed")
            await asyncio.sleep(self._settings.cloudwatch_poll_interval_seconds)
