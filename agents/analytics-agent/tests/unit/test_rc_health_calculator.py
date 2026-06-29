import asyncio

from app.domains.system_analytics.rc_service.health_calculator import calculate_status
from app.domains.system_analytics.rc_service.queries import build_service_queries
from app.domains.system_analytics.rc_service.service import RCSystemAnalyticsService


class StubSettings:
    rc_health_check_url = "https://vi-api.vehicleinfo.app/RC/rc_details_get_and_store/api/health_check"
    webhook_health_check_url = "https://webhook.vehicleinfo.app/webhook/api/health_check"
    prometheus_query_timeout_seconds = 1


def test_calculate_status_uses_available_core_signals_when_some_core_metrics_are_missing() -> None:
    status = calculate_status(
        metrics={
            "request_rate": 0.13,
            "error_rate": None,
            "p50_latency_ms": 25.78,
            "p90_latency_ms": 46.41,
            "p95_latency_ms": 48.98,
            "p99_latency_ms": 83.5,
            "provider_error_rate": None,
            "provider_p95_latency_ms": None,
            "pod_restarts_15m": None,
        },
        missing_metrics=["error_rate", "provider_error_rate", "provider_p95_latency_ms", "pod_restarts_15m"],
        prometheus_available=True,
    )

    assert status == "healthy"


def test_calculate_status_unknown_when_no_core_metrics_are_available() -> None:
    status = calculate_status(
        metrics={
            "request_rate": None,
            "error_rate": None,
            "p50_latency_ms": None,
            "p90_latency_ms": None,
            "p95_latency_ms": None,
            "p99_latency_ms": None,
        },
        missing_metrics=["request_rate", "error_rate", "p50_latency_ms", "p90_latency_ms", "p95_latency_ms", "p99_latency_ms"],
        prometheus_available=True,
    )

    assert status == "unknown"


def test_calculate_status_unknown_when_prometheus_is_unavailable() -> None:
    status = calculate_status(metrics={"request_rate": 1.0}, missing_metrics=[], prometheus_available=False)

    assert status == "unknown"


def test_health_check_status_healthy_for_http_200(monkeypatch) -> None:
    service = RCSystemAnalyticsService.__new__(RCSystemAnalyticsService)
    service.settings = StubSettings()

    class StubResponse:
        status_code = 200

    class StubClient:
        def __init__(self, timeout: float) -> None:
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def get(self, url: str):
            return StubResponse()

    monkeypatch.setattr("app.domains.system_analytics.rc_service.service.httpx.AsyncClient", StubClient)

    assert asyncio.run(service._health_check_status_for("rc")) == "healthy"


def test_health_check_status_unknown_for_auth_failure(monkeypatch) -> None:
    service = RCSystemAnalyticsService.__new__(RCSystemAnalyticsService)
    service.settings = StubSettings()

    class StubResponse:
        status_code = 403

    class StubClient:
        def __init__(self, timeout: float) -> None:
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def get(self, url: str):
            return StubResponse()

    monkeypatch.setattr("app.domains.system_analytics.rc_service.service.httpx.AsyncClient", StubClient)

    assert asyncio.run(service._health_check_status_for("rc")) == "unknown"


def test_health_check_status_critical_for_server_failure(monkeypatch) -> None:
    service = RCSystemAnalyticsService.__new__(RCSystemAnalyticsService)
    service.settings = StubSettings()

    class StubResponse:
        status_code = 500

    class StubClient:
        def __init__(self, timeout: float) -> None:
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def get(self, url: str):
            return StubResponse()

    monkeypatch.setattr("app.domains.system_analytics.rc_service.service.httpx.AsyncClient", StubClient)

    assert asyncio.run(service._health_check_status_for("rc")) == "critical"


def test_health_check_status_uses_webhook_health_url(monkeypatch) -> None:
    service = RCSystemAnalyticsService.__new__(RCSystemAnalyticsService)
    service.settings = StubSettings()
    requested_urls: list[str] = []

    class StubResponse:
        status_code = 200

    class StubClient:
        def __init__(self, timeout: float) -> None:
            self.timeout = timeout

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def get(self, url: str):
            requested_urls.append(url)
            return StubResponse()

    monkeypatch.setattr("app.domains.system_analytics.rc_service.service.httpx.AsyncClient", StubClient)

    assert asyncio.run(service._health_check_status_for("webhook")) == "healthy"
    assert requested_urls == [StubSettings.webhook_health_check_url]


def test_rc_queries_exclude_old_webhook_fallback_series() -> None:
    service = RCSystemAnalyticsService.__new__(RCSystemAnalyticsService)

    class Settings(StubSettings):
        rc_service_name = "rc-service"
        rc_provider_name = "rc-provider"
        rc_environment = "staging"
        rc_service_label = "service"
        rc_provider_label = "provider"
        rc_status_label = "status_code"
        rc_environment_label = "environment"
        rc_pod_label = "pod"
        rc_pod_pattern = "rc-service.*"
        rc_http_requests_metric = "http_requests_total"
        rc_http_duration_bucket_metric = "http_request_duration_seconds_bucket"
        rc_external_requests_metric = "external_requests_total"
        rc_external_duration_bucket_metric = "external_request_duration_seconds_bucket"
        rc_pod_restarts_metric = "kube_pod_container_status_restarts_total"
        rc_cpu_usage_metric = "container_cpu_usage_seconds_total"
        rc_memory_working_set_metric = "container_memory_working_set_bytes"

    service.settings = Settings()

    queries = service._query_config_for("rc")
    promql = build_service_queries(queries)["request_rate"]

    assert ("job", "rc-service-webhook-fallback") in queries.excluded_label_values
    assert ("source_service", "webhook-test-fallback") in queries.excluded_label_values
    assert ("service", "webhook-service") in queries.excluded_label_values
    assert 'service="rc-service"' in promql
    assert 'job!="rc-service-webhook-fallback"' in promql
    assert 'source_service!="webhook-test-fallback"' in promql
    assert 'service!="webhook-service"' in promql


def test_webhook_queries_do_not_exclude_webhook_series() -> None:
    service = RCSystemAnalyticsService.__new__(RCSystemAnalyticsService)

    class Settings(StubSettings):
        rc_provider_name = "rc-provider"
        rc_environment = "staging"
        rc_service_label = "service"
        rc_provider_label = "provider"
        rc_status_label = "status_code"
        rc_environment_label = "environment"
        rc_pod_label = "pod"
        rc_pod_pattern = "rc-service.*"
        rc_http_requests_metric = "http_requests_total"
        rc_http_duration_bucket_metric = "http_request_duration_seconds_bucket"
        rc_external_requests_metric = "external_requests_total"
        rc_external_duration_bucket_metric = "external_request_duration_seconds_bucket"
        rc_pod_restarts_metric = "kube_pod_container_status_restarts_total"
        rc_cpu_usage_metric = "container_cpu_usage_seconds_total"
        rc_memory_working_set_metric = "container_memory_working_set_bytes"

    service.settings = Settings()

    queries = service._query_config_for("webhook")
    promql = build_service_queries(queries)["request_rate"]
    cpu_promql = build_service_queries(queries)["cpu_usage"]
    memory_promql = build_service_queries(queries)["memory_usage_bytes"]

    assert queries.service_name == "webhook-service"
    assert queries.provider_name == "webhook-provider"
    assert queries.status_label == "status_code"
    assert queries.cpu_usage_metric == "process_cpu_seconds_total"
    assert queries.memory_working_set_metric == "process_resident_memory_bytes"
    assert queries.excluded_label_values == ()
    assert 'job=~"webhook-service|rc-service-webhook-fallback"' in promql
    assert 'job=~"webhook-service|rc-service-webhook-fallback"' in cpu_promql
    assert 'job=~"webhook-service|rc-service-webhook-fallback"' in memory_promql
    assert 'service="webhook-service"' not in promql
