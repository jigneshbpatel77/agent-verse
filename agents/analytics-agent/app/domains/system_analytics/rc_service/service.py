from datetime import UTC, datetime
import math

from app.config.settings import get_settings
from app.domains.system_analytics.rc_service.health_calculator import calculate_status
from app.domains.system_analytics.rc_service.queries import ServiceQueryConfig, build_service_queries
from app.domains.system_analytics.rc_service.schemas import MetricDiscoveryResponse, RCHealthResponse, SystemServiceSummary
from app.integrations.prometheus_client import PrometheusClient, PrometheusClientError


DISCOVERY_KEYWORDS = (
    "http",
    "request",
    "duration",
    "latency",
    "external",
    "provider",
    "rc",
    "container",
    "kube",
)

VEHICLEINFO_SYSTEM_SERVICES = {
    "rc": "RC Service",
    "challan": "Challan Service",
    "service-history": "Service History Service",
    "fastag": "Fastag Service",
    "payments": "Payments Service",
}


class RCSystemAnalyticsService:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.prometheus = PrometheusClient(
            self.settings.prometheus_url,
            self.settings.prometheus_query_timeout_seconds,
        )

    def list_services(self) -> list[SystemServiceSummary]:
        return [
            SystemServiceSummary(
                key=service_key,
                display_name=display_name,
                service_name=self._service_name_for(service_key),
            )
            for service_key, display_name in VEHICLEINFO_SYSTEM_SERVICES.items()
        ]

    async def get_health(self, service_key: str = "rc") -> RCHealthResponse:
        normalized_service_key = self._normalize_service_key(service_key)
        config = self._query_config_for(normalized_service_key)
        queries = build_service_queries(config)
        values: dict[str, float | None] = {}
        missing_metrics: list[str] = []
        prometheus_available = True

        for metric_name, promql in queries.items():
            try:
                values[metric_name] = _extract_instant_value(await self.prometheus.query(promql))
            except PrometheusClientError:
                prometheus_available = False
                values[metric_name] = None

            if values[metric_name] is None:
                missing_metrics.append(metric_name)

        status = calculate_status(values, missing_metrics, prometheus_available)

        return RCHealthResponse(
            service_key=normalized_service_key,
            service_name=config.service_name,
            status=status,
            request_rate=values.get("request_rate"),
            error_rate=values.get("error_rate"),
            p50_latency_ms=values.get("p50_latency_ms"),
            p90_latency_ms=values.get("p90_latency_ms"),
            p95_latency_ms=values.get("p95_latency_ms"),
            p99_latency_ms=values.get("p99_latency_ms"),
            cpu_usage=values.get("cpu_usage"),
            memory_usage_bytes=values.get("memory_usage_bytes"),
            pod_restarts_15m=values.get("pod_restarts_15m"),
            provider_error_rate=values.get("provider_error_rate"),
            provider_p95_latency_ms=values.get("provider_p95_latency_ms"),
            generated_at=datetime.now(UTC),
            missing_metrics=missing_metrics,
            raw_prometheus_queries=queries,
        )

    async def discover_metrics(self, service_key: str | None = None) -> MetricDiscoveryResponse:
        normalized_service_key = self._normalize_service_key(service_key) if service_key else None
        metric_names = await self.prometheus.label_values("__name__")
        filtered_names = sorted(
            metric_name
            for metric_name in metric_names
            if any(keyword in metric_name.lower() for keyword in DISCOVERY_KEYWORDS)
        )
        return MetricDiscoveryResponse(
            service_key=normalized_service_key,
            metric_names=filtered_names,
            generated_at=datetime.now(UTC),
        )

    def _query_config_for(self, service_key: str) -> ServiceQueryConfig:
        return ServiceQueryConfig(
            service_name=self._service_name_for(service_key),
            provider_name=self._provider_name_for(service_key),
            environment=self.settings.rc_environment,
            service_label=self.settings.rc_service_label,
            provider_label=self.settings.rc_provider_label,
            status_label=self.settings.rc_status_label,
            environment_label=self.settings.rc_environment_label,
            pod_label=self.settings.rc_pod_label,
            pod_pattern=self._pod_pattern_for(service_key),
            http_requests_metric=self.settings.rc_http_requests_metric,
            http_duration_bucket_metric=self.settings.rc_http_duration_bucket_metric,
            external_requests_metric=self.settings.rc_external_requests_metric,
            external_duration_bucket_metric=self.settings.rc_external_duration_bucket_metric,
            pod_restarts_metric=self.settings.rc_pod_restarts_metric,
            cpu_usage_metric=self.settings.rc_cpu_usage_metric,
            memory_working_set_metric=self.settings.rc_memory_working_set_metric,
        )

    def _service_name_for(self, service_key: str) -> str:
        if service_key == "rc":
            return self.settings.rc_service_name
        return f"{service_key}-service"

    def _provider_name_for(self, service_key: str) -> str:
        if service_key == "rc":
            return self.settings.rc_provider_name
        return f"{service_key}-provider"

    def _pod_pattern_for(self, service_key: str) -> str:
        if service_key == "rc":
            return self.settings.rc_pod_pattern
        return f"{service_key}-service.*"

    def _normalize_service_key(self, service_key: str) -> str:
        normalized = service_key.strip().lower()
        if normalized not in VEHICLEINFO_SYSTEM_SERVICES:
            allowed = ", ".join(VEHICLEINFO_SYSTEM_SERVICES)
            raise ValueError(f"Unsupported system analytics service '{service_key}'. Allowed services: {allowed}")
        return normalized


def _extract_instant_value(payload: dict) -> float | None:
    data = payload.get("data")
    if not isinstance(data, dict):
        return None

    result = data.get("result")
    if not isinstance(result, list) or not result:
        return None

    value = result[0].get("value")
    if not isinstance(value, list) or len(value) < 2:
        return None

    try:
        parsed_value = float(value[1])
    except (TypeError, ValueError):
        return None

    if not math.isfinite(parsed_value):
        return None

    return parsed_value
