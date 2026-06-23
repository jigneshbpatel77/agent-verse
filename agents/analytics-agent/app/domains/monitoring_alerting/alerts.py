import logging

import requests

from app.config.settings import Settings
from app.domains.monitoring_alerting.schemas import AnalysisResult

logger = logging.getLogger(__name__)

SEVERITY_RANK = {
    "none": 0,
    "low": 1,
    "medium": 2,
    "high": 3,
    "critical": 4,
}


class AlertDispatcher:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._min_severity = settings.alert_min_severity
        if self._min_severity not in SEVERITY_RANK:
            raise ValueError(f"Unsupported ALERT_MIN_SEVERITY: {self._min_severity}")

    def dispatch_if_needed(self, result: AnalysisResult) -> bool:
        if SEVERITY_RANK[result.highest_severity] < SEVERITY_RANK[self._min_severity]:
            return False

        payload = result.model_dump(mode="json")
        logger.warning("Monitoring alert triggered: %s", payload)

        if self._settings.alert_webhook_url:
            response = requests.post(self._settings.alert_webhook_url, json=payload, timeout=10)
            response.raise_for_status()

        return True
