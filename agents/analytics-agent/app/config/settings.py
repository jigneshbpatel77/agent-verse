from functools import lru_cache
from typing import Annotated, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode


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
    openai_api_key: Optional[str] = Field(default=None, alias="OPENAI_API_KEY")
    anthropic_api_key: Optional[str] = Field(default=None, alias="ANTHROPIC_API_KEY")
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

    aws_access_key_id: Optional[str] = Field(default=None, alias="AWS_ACCESS_KEY_ID")
    aws_secret_access_key: Optional[str] = Field(default=None, alias="AWS_SECRET_ACCESS_KEY")
    aws_session_token: Optional[str] = Field(default=None, alias="AWS_SESSION_TOKEN")
    aws_region: str = Field(default="us-east-1", alias="AWS_REGION")
    cloudwatch_log_groups: Annotated[list[str], NoDecode] = Field(
        default_factory=list, alias="CLOUDWATCH_LOG_GROUPS"
    )
    cloudwatch_filter_pattern: Optional[str] = Field(default=None, alias="CLOUDWATCH_FILTER_PATTERN")
    cloudwatch_lookback_minutes: int = Field(default=2, alias="CLOUDWATCH_LOOKBACK_MINUTES", ge=1)
    cloudwatch_poll_interval_seconds: int = Field(
        default=60, alias="CLOUDWATCH_POLL_INTERVAL_SECONDS", ge=10
    )
    enable_cloudwatch_poller: bool = Field(default=False, alias="ENABLE_CLOUDWATCH_POLLER")
    llm_provider: str = Field(default="openai", alias="LLM_PROVIDER")
    openai_model: str = Field(default="gpt-4.1-mini", alias="OPENAI_MODEL")
    openai_base_url: Optional[str] = Field(default=None, alias="OPENAI_BASE_URL")
    xai_api_key: Optional[str] = Field(default=None, alias="XAI_API_KEY")
    xai_base_url: str = Field(default="https://api.x.ai/v1", alias="XAI_BASE_URL")
    xai_model: str = Field(default="grok-4", alias="XAI_MODEL")
    max_log_chars: int = Field(default=12000, alias="MAX_LOG_CHARS", ge=1000)
    alert_min_severity: str = Field(default="medium", alias="ALERT_MIN_SEVERITY")
    alert_webhook_url: Optional[str] = Field(default=None, alias="ALERT_WEBHOOK_URL")

    model_config = {"env_file": ".env", "extra": "ignore"}

    @field_validator("cloudwatch_log_groups", mode="before")
    @classmethod
    def parse_log_groups(cls, value: object) -> list[str]:
        if value is None or value == "":
            return []
        if isinstance(value, str):
            return [item.strip() for item in value.split(",") if item.strip()]
        if isinstance(value, list):
            return value
        raise TypeError("CLOUDWATCH_LOG_GROUPS must be a comma-separated string or list")

    @field_validator(
        "cloudwatch_filter_pattern",
        "alert_webhook_url",
        "openai_api_key",
        "anthropic_api_key",
        "openai_base_url",
        "xai_api_key",
        "aws_access_key_id",
        "aws_secret_access_key",
        "aws_session_token",
        mode="before",
    )
    @classmethod
    def empty_string_to_none(cls, value: object) -> object:
        if value == "":
            return None
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
