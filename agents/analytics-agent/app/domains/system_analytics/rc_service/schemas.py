from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


RCHealthStatus = Literal["healthy", "degraded", "critical", "unknown"]


class RCHealthResponse(BaseModel):
    service_key: str = "rc"
    service_name: str
    status: RCHealthStatus
    request_rate: float | None = None
    error_rate: float | None = None
    p50_latency_ms: float | None = None
    p90_latency_ms: float | None = None
    p95_latency_ms: float | None = None
    p99_latency_ms: float | None = None
    cpu_usage: float | None = None
    memory_usage_bytes: float | None = None
    pod_restarts_15m: float | None = None
    provider_error_rate: float | None = None
    provider_p95_latency_ms: float | None = None
    generated_at: datetime
    missing_metrics: list[str] = Field(default_factory=list)
    raw_prometheus_queries: dict[str, str] = Field(default_factory=dict)


class MetricDiscoveryResponse(BaseModel):
    service_key: str | None = None
    metric_names: list[str]
    generated_at: datetime


class SystemServiceSummary(BaseModel):
    key: str
    display_name: str
    service_name: str
    enabled: bool = True
