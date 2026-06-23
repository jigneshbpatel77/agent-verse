import base64
import gzip
import json
from datetime import datetime, timezone
from typing import Any

from app.domains.monitoring_alerting.schemas import LogEvent


def decode_cloudwatch_subscription(payload: dict[str, Any]) -> list[LogEvent]:
    encoded = payload.get("awslogs", {}).get("data")
    if not isinstance(encoded, str):
        raise ValueError("Expected CloudWatch subscription payload at awslogs.data")

    decoded = gzip.decompress(base64.b64decode(encoded))
    body = json.loads(decoded)

    log_group = body.get("logGroup")
    log_stream = body.get("logStream")
    events: list[LogEvent] = []
    for item in body.get("logEvents", []):
        timestamp = datetime.fromtimestamp(item["timestamp"] / 1000, tz=timezone.utc)
        events.append(
            LogEvent(
                source="cloudwatch-subscription",
                message=item.get("message", ""),
                timestamp=timestamp,
                event_id=item.get("id"),
                log_group=log_group,
                log_stream=log_stream,
            )
        )

    return events
