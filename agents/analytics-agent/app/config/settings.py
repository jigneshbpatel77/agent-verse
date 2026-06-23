from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    service_name: str = Field(default="analytics-agent", alias="SERVICE_NAME")
    environment: str = Field(default="local", alias="ENVIRONMENT")
    port: int = Field(default=8000, alias="PORT")
    database_url: str = Field(alias="DATABASE_URL")
    redis_url: str = Field(alias="REDIS_URL")
    kafka_brokers: str = Field(alias="KAFKA_BROKERS")
    qdrant_url: str = Field(alias="QDRANT_URL")
    clickhouse_url: str = Field(alias="CLICKHOUSE_URL")
    temporal_address: str = Field(alias="TEMPORAL_ADDRESS")
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    anthropic_api_key: str | None = Field(default=None, alias="ANTHROPIC_API_KEY")
    otel_exporter_otlp_endpoint: str = Field(alias="OTEL_EXPORTER_OTLP_ENDPOINT")
    jwt_secret: str = Field(alias="JWT_SECRET")
    prometheus_url: str = Field(default="http://localhost:9090", alias="PROMETHEUS_URL")
    rc_service_name: str = Field(default="rc-service", alias="RC_SERVICE_NAME")
    rc_provider_name: str = Field(default="rc-provider", alias="RC_PROVIDER_NAME")
    rc_environment: str = Field(default="staging", alias="RC_ENVIRONMENT")
    prometheus_query_timeout_seconds: float = Field(default=10, alias="PROMETHEUS_QUERY_TIMEOUT_SECONDS")
    rc_service_label: str = Field(default="service", alias="RC_SERVICE_LABEL")
    rc_provider_label: str = Field(default="provider", alias="RC_PROVIDER_LABEL")
    rc_status_label: str = Field(default="status", alias="RC_STATUS_LABEL")
    rc_environment_label: str | None = Field(default=None, alias="RC_ENVIRONMENT_LABEL")
    rc_pod_label: str = Field(default="pod", alias="RC_POD_LABEL")
    rc_pod_pattern: str = Field(default="rc-service.*", alias="RC_POD_PATTERN")
    rc_http_requests_metric: str = Field(default="http_requests_total", alias="RC_HTTP_REQUESTS_METRIC")
    rc_http_duration_bucket_metric: str = Field(
        default="http_request_duration_seconds_bucket",
        alias="RC_HTTP_DURATION_BUCKET_METRIC",
    )
    rc_external_requests_metric: str = Field(
        default="external_api_requests_total",
        alias="RC_EXTERNAL_REQUESTS_METRIC",
    )
    rc_external_duration_bucket_metric: str = Field(
        default="external_api_duration_seconds_bucket",
        alias="RC_EXTERNAL_DURATION_BUCKET_METRIC",
    )
    rc_pod_restarts_metric: str = Field(
        default="kube_pod_container_status_restarts_total",
        alias="RC_POD_RESTARTS_METRIC",
    )
    rc_cpu_usage_metric: str = Field(
        default="container_cpu_usage_seconds_total",
        alias="RC_CPU_USAGE_METRIC",
    )
    rc_memory_working_set_metric: str = Field(
        default="container_memory_working_set_bytes",
        alias="RC_MEMORY_WORKING_SET_METRIC",
    )

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
