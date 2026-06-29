from dataclasses import dataclass


@dataclass(frozen=True)
class ServiceQueryConfig:
    service_name: str
    provider_name: str
    environment: str
    service_label: str
    provider_label: str
    status_label: str
    environment_label: str | None
    pod_label: str
    pod_pattern: str
    http_requests_metric: str
    http_duration_bucket_metric: str
    external_requests_metric: str
    external_duration_bucket_metric: str
    pod_restarts_metric: str
    cpu_usage_metric: str
    memory_working_set_metric: str
    excluded_label_values: tuple[tuple[str, str], ...] = ()
    service_matchers_override: tuple[tuple[str, str, str], ...] = ()
    runtime_matchers_override: tuple[tuple[str, str, str], ...] = ()
    include_provider_metrics: bool = True
    include_pod_restart_metrics: bool = True
    extra_queries: tuple[tuple[str, str], ...] = ()


def build_service_queries(config: ServiceQueryConfig) -> dict[str, str]:
    service_matchers = _service_matchers(config)
    runtime_matchers = _runtime_matchers(config)
    error_matchers = _append_matcher(service_matchers, config.status_label, "=~", "5..")

    request_rate = f"sum(rate({config.http_requests_metric}{{{service_matchers}}}[5m]))"
    request_rate_denominator = f"sum(rate({config.http_requests_metric}{{{service_matchers}}}[5m]))"

    queries = {
        "request_rate": request_rate,
        "error_rate": (
            f"(sum(rate({config.http_requests_metric}{{{error_matchers}}}[5m])) or vector(0))"
            f" / clamp_min({request_rate_denominator}, 1)"
        ),
        "p50_latency_ms": _latency_query(config.http_duration_bucket_metric, service_matchers, "0.50"),
        "p90_latency_ms": _latency_query(config.http_duration_bucket_metric, service_matchers, "0.90"),
        "p95_latency_ms": _latency_query(config.http_duration_bucket_metric, service_matchers, "0.95"),
        "p99_latency_ms": _latency_query(config.http_duration_bucket_metric, service_matchers, "0.99"),
        "cpu_usage": f"sum(rate({config.cpu_usage_metric}{{{runtime_matchers}}}[5m]))",
        "memory_usage_bytes": f"sum({config.memory_working_set_metric}{{{runtime_matchers}}})",
    }

    if config.include_provider_metrics:
        provider_matchers = _provider_matchers(config)
        provider_error_matchers = _append_matcher(provider_matchers, config.status_label, "=~", "5..|timeout")
        provider_rate_denominator = f"sum(rate({config.external_requests_metric}{{{provider_matchers}}}[5m]))"
        queries.update(
            {
                "provider_p95_latency_ms": _latency_query(config.external_duration_bucket_metric, provider_matchers, "0.95"),
                "provider_error_rate": (
                    f"(sum(rate({config.external_requests_metric}{{{provider_error_matchers}}}[5m])) or vector(0))"
                    f" / clamp_min({provider_rate_denominator}, 1)"
                ),
            }
        )

    if config.include_pod_restart_metrics:
        queries["pod_restarts_15m"] = f"sum(increase({config.pod_restarts_metric}{{{runtime_matchers}}}[15m]))"

    queries.update(dict(config.extra_queries))
    return queries


def _latency_query(metric_name: str, matchers: str, quantile: str) -> str:
    return f"histogram_quantile({quantile}, sum(rate({metric_name}{{{matchers}}}[5m])) by (le)) * 1000"


def _service_matchers(config: ServiceQueryConfig) -> str:
    if config.service_matchers_override:
        return ",".join(_matcher(label, operator, value) for label, operator, value in config.service_matchers_override)

    matchers = [_matcher(config.service_label, "=", config.service_name)]
    if config.environment_label and config.environment:
        matchers.append(_matcher(config.environment_label, "=", config.environment))
    matchers.extend(_matcher(label, "!=", value) for label, value in config.excluded_label_values)
    return ",".join(matchers)


def _provider_matchers(config: ServiceQueryConfig) -> str:
    if config.service_matchers_override:
        return ",".join(_matcher(label, operator, value) for label, operator, value in config.service_matchers_override)

    matchers = [
        _matcher(config.service_label, "=", config.service_name),
        _matcher(config.provider_label, "=", config.provider_name),
    ]
    if config.environment_label and config.environment:
        matchers.append(_matcher(config.environment_label, "=", config.environment))
    matchers.extend(_matcher(label, "!=", value) for label, value in config.excluded_label_values)
    return ",".join(matchers)


def _runtime_matchers(config: ServiceQueryConfig) -> str:
    if config.runtime_matchers_override:
        return ",".join(_matcher(label, operator, value) for label, operator, value in config.runtime_matchers_override)
    return _matcher(config.pod_label, "=~", config.pod_pattern)


def _append_matcher(matchers: str, label: str, operator: str, value: str) -> str:
    return f"{matchers},{_matcher(label, operator, value)}"


def _matcher(label: str, operator: str, value: str) -> str:
    escaped_value = value.replace("\\", "\\\\").replace('"', '\\"')
    return f'{label}{operator}"{escaped_value}"'
