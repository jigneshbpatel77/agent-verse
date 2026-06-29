from app.domains.system_analytics.rc_service.schemas import RCHealthStatus


CORE_METRICS = {
    "request_rate",
    "error_rate",
    "p50_latency_ms",
    "p90_latency_ms",
    "p95_latency_ms",
    "p99_latency_ms",
}


def calculate_status(metrics: dict[str, float | None], missing_metrics: list[str], prometheus_available: bool) -> RCHealthStatus:
    if not prometheus_available:
        return "unknown"
    if not any(metrics.get(metric_name) is not None for metric_name in CORE_METRICS):
        return "unknown"

    error_rate = metrics.get("error_rate")
    p95_latency_ms = metrics.get("p95_latency_ms")
    p99_latency_ms = metrics.get("p99_latency_ms")
    provider_error_rate = metrics.get("provider_error_rate")
    provider_p95_latency_ms = metrics.get("provider_p95_latency_ms")
    pod_restarts_15m = metrics.get("pod_restarts_15m")

    if (
        _gte(error_rate, 0.05)
        or _gte(p99_latency_ms, 5000)
        or _gte(provider_error_rate, 0.20)
        or _gte(pod_restarts_15m, 3)
    ):
        return "critical"

    if (
        _gte(error_rate, 0.02)
        or _gte(p95_latency_ms, 2000)
        or _gte(p99_latency_ms, 3000)
        or _gte(provider_error_rate, 0.10)
        or _gte(provider_p95_latency_ms, 3000)
        or _gte(pod_restarts_15m, 1)
    ):
        return "degraded"

    return "healthy"


def _gte(value: float | None, threshold: float) -> bool:
    return value is not None and value >= threshold
