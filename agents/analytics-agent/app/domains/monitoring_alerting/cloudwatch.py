from datetime import datetime, timedelta, timezone
import logging
from typing import Any
from typing import Iterable, Optional

from app.domains.monitoring_alerting.schemas import LogEvent

logger = logging.getLogger(__name__)


class CloudWatchLogReader:
    def __init__(
        self,
        region_name: str,
        aws_access_key_id: Optional[str] = None,
        aws_secret_access_key: Optional[str] = None,
        aws_session_token: Optional[str] = None,
    ) -> None:
        try:
            import boto3
        except ModuleNotFoundError as exc:
            raise ValueError(
                "The 'boto3' package is required for CloudWatch monitoring. "
                "Install analytics-agent dependencies with `python -m pip install -e .` "
                "from agents/analytics-agent."
            ) from exc

        client_kwargs: dict[str, Any] = {"region_name": region_name}
        if aws_access_key_id and aws_secret_access_key:
            client_kwargs["aws_access_key_id"] = aws_access_key_id
            client_kwargs["aws_secret_access_key"] = aws_secret_access_key
        if aws_session_token:
            client_kwargs["aws_session_token"] = aws_session_token

        self._client = boto3.client("logs", **client_kwargs)

    def read_recent_events(
        self,
        log_groups: Iterable[str],
        lookback_minutes: int,
        filter_pattern: Optional[str] = None,
        seen_event_ids: Optional[set[str]] = None,
    ) -> list[LogEvent]:
        start_time = datetime.now(timezone.utc) - timedelta(minutes=lookback_minutes)
        start_time_ms = int(start_time.timestamp() * 1000)
        events: list[LogEvent] = []

        logger.info(
            "CloudWatch fetch starting: log_groups=%s lookback_minutes=%s filter_pattern=%s",
            list(log_groups),
            lookback_minutes,
            "set" if filter_pattern else "not_set",
        )

        for log_group in log_groups:
            group_count = 0
            kwargs: dict[str, object] = {
                "logGroupName": log_group,
                "startTime": start_time_ms,
                "interleaved": True,
            }
            if filter_pattern:
                kwargs["filterPattern"] = filter_pattern

            while True:
                response = self._client.filter_log_events(**kwargs)
                for item in response.get("events", []):
                    event_id = item.get("eventId")
                    if seen_event_ids is not None and event_id in seen_event_ids:
                        continue
                    if seen_event_ids is not None and isinstance(event_id, str):
                        seen_event_ids.add(event_id)

                    timestamp = datetime.fromtimestamp(item["timestamp"] / 1000, tz=timezone.utc)
                    events.append(
                        LogEvent(
                            source="cloudwatch",
                            message=item.get("message", ""),
                            timestamp=timestamp,
                            event_id=event_id,
                            log_group=log_group,
                            log_stream=item.get("logStreamName"),
                        )
                    )
                    group_count += 1

                next_token = response.get("nextToken")
                if not next_token:
                    break
                kwargs["nextToken"] = next_token

            logger.info("CloudWatch fetch complete for log_group=%s events=%s", log_group, group_count)

        logger.info("CloudWatch fetch complete: total_events=%s", len(events))
        return events
