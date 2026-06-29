from datetime import UTC, datetime
import math

import httpx

from app.config.settings import get_settings
from app.domains.system_analytics.rc_service.health_calculator import calculate_status
from app.domains.system_analytics.rc_service.queries import ServiceQueryConfig, build_service_queries
from app.domains.system_analytics.rc_service.schemas import MetricDiscoveryResponse, RCHealthResponse, RCHealthStatus, SystemServiceSummary
from app.integrations.prometheus_client import PrometheusClient, PrometheusClientError


DISCOVERY_KEYWORDS = (
    "http",
    "request",
    "duration",
    "latency",
    "external",
    "provider",
    "rc",
    "webhook",
    "container",
    "kube",
)

VEHICLEINFO_SYSTEM_SERVICES = {
    "rc": "RC Service",
    "challan": "Challan Service",
    "service-history": "Service History Service",
    "fastag": "Fastag Service",
    "payments": "Payments Service",
    "webhook": "Webhook Service",
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

        metric_status = calculate_status(values, missing_metrics, prometheus_available)
        status = await self._health_check_status_for(normalized_service_key) or metric_status

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
            process_uptime_seconds=values.get("process_uptime_seconds"),
            event_loop_lag_p99_ms=values.get("event_loop_lag_p99_ms"),
            heap_used_bytes=values.get("heap_used_bytes"),
            active_handles=values.get("active_handles"),
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
        is_webhook = service_key == "webhook"
        return ServiceQueryConfig(
            service_name=self._service_name_for(service_key),
            provider_name=self._provider_name_for(service_key),
            environment=self.settings.rc_environment,
            service_label=self.settings.rc_service_label,
            provider_label=self.settings.rc_provider_label,
            status_label="status_code" if is_webhook else self.settings.rc_status_label,
            environment_label=self.settings.rc_environment_label,
            pod_label=self.settings.rc_pod_label,
            pod_pattern=self._pod_pattern_for(service_key),
            http_requests_metric=self.settings.rc_http_requests_metric,
            http_duration_bucket_metric=self.settings.rc_http_duration_bucket_metric,
            external_requests_metric=self.settings.rc_external_requests_metric,
            external_duration_bucket_metric=self.settings.rc_external_duration_bucket_metric,
            pod_restarts_metric=self.settings.rc_pod_restarts_metric,
            cpu_usage_metric="process_cpu_seconds_total" if is_webhook else self.settings.rc_cpu_usage_metric,
            memory_working_set_metric="process_resident_memory_bytes" if is_webhook else self.settings.rc_memory_working_set_metric,
            excluded_label_values=self._excluded_label_values_for(service_key),
            service_matchers_override=self._service_matchers_override_for(service_key),
            runtime_matchers_override=self._runtime_matchers_override_for(service_key),
            include_provider_metrics=not is_webhook,
            include_pod_restart_metrics=not is_webhook,
            extra_queries=self._extra_queries_for(service_key),
        )

    async def _health_check_status_for(self, service_key: str) -> RCHealthStatus | None:
        health_check_url = self._health_check_url_for(service_key)
        if not health_check_url:
            return None

        try:
            async with httpx.AsyncClient(timeout=self.settings.prometheus_query_timeout_seconds) as client:
                response = await client.get(health_check_url)
        except (httpx.TimeoutException, httpx.ConnectError, httpx.HTTPError):
            return "unknown"

        if response.status_code == 200:
            return "healthy"
        if response.status_code in {401, 403}:
            return "unknown"
        if response.status_code == 429 or response.status_code >= 500:
            return "critical"
        return "degraded"

    def _health_check_url_for(self, service_key: str) -> str | None:
        if service_key == "rc":
            return self.settings.rc_health_check_url
        if service_key == "webhook":
            return self.settings.webhook_health_check_url
        return None

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

    def _excluded_label_values_for(self, service_key: str) -> tuple[tuple[str, str], ...]:
        if service_key != "rc":
            return ()
        return (
            ("job", "rc-service-webhook-fallback"),
            ("source_service", "webhook-test-fallback"),
            (self.settings.rc_service_label, "webhook-service"),
        )

    def _service_matchers_override_for(self, service_key: str) -> tuple[tuple[str, str, str], ...]:
        if service_key != "webhook":
            return ()
        return (("job", "=~", "webhook-service|rc-service-webhook-fallback"),)

    def _runtime_matchers_override_for(self, service_key: str) -> tuple[tuple[str, str, str], ...]:
        if service_key != "webhook":
            return ()
        return (("job", "=~", "webhook-service|rc-service-webhook-fallback"),)

    def _extra_queries_for(self, service_key: str) -> tuple[tuple[str, str], ...]:
        if service_key != "webhook":
            return ()

        matchers = 'job=~"webhook-service|rc-service-webhook-fallback"'
        return (
            ("process_uptime_seconds", f"max(time() - process_start_time_seconds{{{matchers}}})"),
            ("event_loop_lag_p99_ms", f"max(nodejs_eventloop_lag_p99_seconds{{{matchers}}}) * 1000"),
            ("heap_used_bytes", f"max(nodejs_heap_size_used_bytes{{{matchers}}})"),
            ("active_handles", f"max(nodejs_active_handles_total{{{matchers}}})"),
        )

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
