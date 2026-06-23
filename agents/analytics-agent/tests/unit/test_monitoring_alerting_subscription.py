import base64
import gzip
import json

from app.domains.monitoring_alerting.subscription import decode_cloudwatch_subscription


def test_decode_cloudwatch_subscription_payload() -> None:
    body = {
        "logGroup": "/aws/lambda/example",
        "logStream": "2026/06/23/[$LATEST]abc",
        "logEvents": [
            {
                "id": "event-1",
                "timestamp": 1782200000000,
                "message": "ERROR timeout while calling database",
            }
        ],
    }
    payload = {
        "awslogs": {
            "data": base64.b64encode(gzip.compress(json.dumps(body).encode("utf-8"))).decode(
                "utf-8"
            )
        }
    }

    events = decode_cloudwatch_subscription(payload)

    assert len(events) == 1
    assert events[0].event_id == "event-1"
    assert events[0].log_group == "/aws/lambda/example"
    assert events[0].message == "ERROR timeout while calling database"
