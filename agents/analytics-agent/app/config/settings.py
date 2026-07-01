from functools import lru_cache
from pathlib import Path
from typing import Annotated, Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode

AGENT_ROOT = Path(__file__).resolve().parents[2]
REPO_ROOT = Path(__file__).resolve().parents[4]


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
    ai_provider: str = Field(default="deterministic", alias="AI_PROVIDER")
    provider_api_key: Optional[str] = Field(default=None, alias="PROVIDER_API_KEY")
    openrouter_model: str = Field(default="openrouter/auto", alias="OPENROUTER_MODEL")
    openrouter_base_url: str = Field(default="https://openrouter.ai/api/v1", alias="OPENROUTER_BASE_URL")
    commander_llm_timeout_seconds: float = Field(default=30, alias="COMMANDER_LLM_TIMEOUT_SECONDS", ge=1)
    otel_exporter_otlp_endpoint: str = Field(alias="OTEL_EXPORTER_OTLP_ENDPOINT")
    jwt_secret: str = Field(alias="JWT_SECRET")
    prometheus_url: str = Field(default="http://localhost:9090", alias="PROMETHEUS_URL")
    rc_service_name: str = Field(default="rc-service", alias="RC_SERVICE_NAME")
    rc_provider_name: str = Field(default="rc-provider", alias="RC_PROVIDER_NAME")
    rc_environment: str = Field(default="staging", alias="RC_ENVIRONMENT")
    prometheus_query_timeout_seconds: float = Field(default=10, alias="PROMETHEUS_QUERY_TIMEOUT_SECONDS")
    rc_health_check_url: str | None = Field(
        default="https://vi-api.vehicleinfo.app/RC/rc_details_get_and_store/api/health_check",
        alias="RC_HEALTH_CHECK_URL",
    )
    webhook_health_check_url: str | None = Field(
        default="https://webhook.vehicleinfo.app/webhook/api/health_check",
        alias="WEBHOOK_HEALTH_CHECK_URL",
    )
    rc_service_label: str = Field(default="service", alias="RC_SERVICE_LABEL")
    rc_provider_label: str = Field(default="provider", alias="RC_PROVIDER_LABEL")
    rc_status_label: str = Field(default="status_code", alias="RC_STATUS_LABEL")
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

    # RDS MySQL Connection Profiles (Single fallback config)
    rds_host: str = Field(default="", alias="RDS_HOST")
    rds_port: int = Field(default=3306, alias="RDS_PORT")
    rds_user: str = Field(default="", alias="RDS_USER")
    rds_password: str = Field(default="", alias="RDS_PASSWORD")
    rds_database: str = Field(default="", alias="RDS_DATABASE")
    rds_ssl_mode: str = Field(default="", alias="RDS_SSL_MODE")
    business_analytics_local_fallback_only: bool = Field(
        default=False,
        alias="BUSINESS_ANALYTICS_LOCAL_FALLBACK_ONLY",
    )

    # Per-service Overrides (Challan, Service History, FASTag)
    rds_challan_host: str = Field(default="", alias="RDS_CHALLAN_HOST")
    rds_challan_port: int = Field(default=0, alias="RDS_CHALLAN_PORT")
    rds_challan_user: str = Field(default="", alias="RDS_CHALLAN_USER")
    rds_challan_password: str = Field(default="", alias="RDS_CHALLAN_PASSWORD")
    rds_challan_database: str = Field(default="", alias="RDS_CHALLAN_DATABASE")
    rds_challan_table: str = Field(default="", alias="RDS_CHALLAN_TABLE")
    rds_challan_ssl_mode: str = Field(default="", alias="RDS_CHALLAN_SSL_MODE")

    rds_service_history_host: str = Field(default="", alias="RDS_SERVICE_HISTORY_HOST")
    rds_service_history_port: int = Field(default=0, alias="RDS_SERVICE_HISTORY_PORT")
    rds_service_history_user: str = Field(default="", alias="RDS_SERVICE_HISTORY_USER")
    rds_service_history_password: str = Field(default="", alias="RDS_SERVICE_HISTORY_PASSWORD")
    rds_service_history_database: str = Field(default="", alias="RDS_SERVICE_HISTORY_DATABASE")
    rds_service_history_table: str = Field(default="", alias="RDS_SERVICE_HISTORY_TABLE")
    rds_service_history_ssl_mode: str = Field(default="", alias="RDS_SERVICE_HISTORY_SSL_MODE")

    rds_fastag_host: str = Field(default="", alias="RDS_FASTAG_HOST")
    rds_fastag_port: int = Field(default=0, alias="RDS_FASTAG_PORT")
    rds_fastag_user: str = Field(default="", alias="RDS_FASTAG_USER")
    rds_fastag_password: str = Field(default="", alias="RDS_FASTAG_PASSWORD")
    rds_fastag_database: str = Field(default="", alias="RDS_FASTAG_DATABASE")
    rds_fastag_table: str = Field(default="", alias="RDS_FASTAG_TABLE")
    rds_fastag_ssl_mode: str = Field(default="", alias="RDS_FASTAG_SSL_MODE")
    enable_business_analytics_sync: bool = Field(default=False, alias="ENABLE_BUSINESS_ANALYTICS_SYNC")
    business_analytics_sync_interval_seconds: int = Field(
        default=900,
        alias="BUSINESS_ANALYTICS_SYNC_INTERVAL_SECONDS",
        ge=60,
    )
    enable_policybazaar_email_ingestion: bool = Field(default=False, alias="ENABLE_POLICYBAZAAR_EMAIL_INGESTION")
    gmail_delegated_user: str = Field(default="", alias="GMAIL_DELEGATED_USER")
    gmail_service_account_file: str = Field(default="", alias="GMAIL_SERVICE_ACCOUNT_FILE")
    gmail_service_account_json: str = Field(default="", alias="GMAIL_SERVICE_ACCOUNT_JSON")
    gmail_pubsub_topic: str = Field(default="", alias="GMAIL_PUBSUB_TOPIC")
    gmail_pubsub_verification_token: str = Field(default="", alias="GMAIL_PUBSUB_VERIFICATION_TOKEN")
    gmail_watch_label_ids: Annotated[list[str], NoDecode] = Field(default_factory=lambda: ["INBOX"], alias="GMAIL_WATCH_LABEL_IDS")
    gmail_policybazaar_sender: str = Field(default="analytic@policybazaar.com", alias="GMAIL_POLICYBAZAAR_SENDER")
    gmail_policybazaar_subject_keyword: str = Field(
        default="VehicleInfo Two-wheeler MTD booking till",
        alias="GMAIL_POLICYBAZAAR_SUBJECT_KEYWORD",
    )
    gmail_policybazaar_car_subject_keyword: str = Field(
        default="Vehicleinfo_Motor",
        alias="GMAIL_POLICYBAZAAR_CAR_SUBJECT_KEYWORD",
    )
    gmail_policybazaar_cv_subject_keyword: str = Field(
        default="Vehicleinfo_Cv",
        alias="GMAIL_POLICYBAZAAR_CV_SUBJECT_KEYWORD",
    )
    policybazaar_refresh_window_days: int = Field(default=15, alias="POLICYBAZAAR_REFRESH_WINDOW_DAYS", ge=1)

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
    google_application_credentials: Optional[str] = Field(
        default=None, alias="GOOGLE_APPLICATION_CREDENTIALS"
    )
    firebase_project_id: Optional[str] = Field(default=None, alias="FIREBASE_PROJECT_ID")
    firebase_ga4_property_id: Optional[str] = Field(default=None, alias="FIREBASE_GA4_PROPERTY_ID")
    firebase_android_app_id: Optional[str] = Field(default=None, alias="FIREBASE_ANDROID_APP_ID")
    firebase_request_timeout_seconds: float = Field(
        default=20, alias="FIREBASE_REQUEST_TIMEOUT_SECONDS", ge=1
    )

    vehicleinfo_dashboard_base_url: str = Field(
        default="https://dashboard-prod-api.vehicleinfo.app",
        alias="VEHICLEINFO_DASHBOARD_BASE_URL",
    )
    vehicleinfo_dashboard_email: Optional[str] = Field(default=None, alias="VEHICLEINFO_DASHBOARD_EMAIL")
    vehicleinfo_dashboard_password: Optional[str] = Field(default=None, alias="VEHICLEINFO_DASHBOARD_PASSWORD")
    vehicleinfo_dashboard_api_key: Optional[str] = Field(default=None, alias="VEHICLEINFO_DASHBOARD_API_KEY")
    google_ads_request_timeout_seconds: float = Field(
        default=20, alias="GOOGLE_ADS_REQUEST_TIMEOUT_SECONDS", ge=1
    )
    google_ads_auth_token_ttl_seconds: int = Field(
        default=3300, alias="GOOGLE_ADS_AUTH_TOKEN_TTL_SECONDS", ge=60
    )
    enable_google_ads_sync: bool = Field(default=False, alias="ENABLE_GOOGLE_ADS_SYNC")

    # User-registration analytics ingestion. Source is config-driven so the CSV path used
    # while the RC RDS is unreachable and the live RDS path use the same downstream pipeline.
    # Live RDS is the default now that the RC read-replica is reachable; csv stays as a fallback.
    user_registration_data_source: str = Field(default="rds", alias="USER_REGISTRATION_DATA_SOURCE")
    user_registration_csv_path: str = Field(default="", alias="USER_REGISTRATION_CSV_PATH")
    user_registration_rds_table: str = Field(default="user_registration", alias="USER_REGISTRATION_RDS_TABLE")
    user_registration_fetch_limit: int = Field(default=1000, alias="USER_REGISTRATION_FETCH_LIMIT", ge=1)
    # Warehouse retention window in days. 0 = keep every fetched row (no date cap).
    user_registration_retention_days: int = Field(default=3, alias="USER_REGISTRATION_RETENTION_DAYS", ge=0)
    # Graceful reconnect handling for the RDS attach.
    user_registration_rds_max_retries: int = Field(default=3, alias="USER_REGISTRATION_RDS_MAX_RETRIES", ge=1)
    user_registration_rds_retry_backoff_seconds: float = Field(
        default=2.0, alias="USER_REGISTRATION_RDS_RETRY_BACKOFF_SECONDS", ge=0
    )

    model_config = {
        "env_file": (REPO_ROOT / ".env", AGENT_ROOT / ".env"),
        "extra": "ignore",
    }

    @field_validator("cloudwatch_log_groups", "gmail_watch_label_ids", mode="before")
    @classmethod
    def parse_csv_list(cls, value: object) -> list[str]:
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
        "provider_api_key",
        "openai_base_url",
        "xai_api_key",
        "aws_access_key_id",
        "aws_secret_access_key",
        "aws_session_token",
        "google_application_credentials",
        "firebase_project_id",
        "firebase_ga4_property_id",
        "firebase_android_app_id",
        "vehicleinfo_dashboard_email",
        "vehicleinfo_dashboard_password",
        "vehicleinfo_dashboard_api_key",
        mode="before",
    )
    @classmethod
    def empty_string_to_none(cls, value: object) -> object:
        if value == "":
            return None
        return value

    def mysql_profile_for(self, source_table: str) -> dict:
        """Resolves the database profile for each service by checking overrides first, then fallbacks."""
        prefix = ""
        if source_table == "challan_payment":
            prefix = "rds_challan_"
        elif source_table == "service_history_payments":
            prefix = "rds_service_history_"
        elif source_table == "buy_fastag_payment":
            prefix = "rds_fastag_"
        else:
            raise ValueError(f"Unknown source table: {source_table}")

        host = getattr(self, f"{prefix}host") or self.rds_host or "localhost"
        port = getattr(self, f"{prefix}port") or self.rds_port or 3306
        user = getattr(self, f"{prefix}user") or self.rds_user or "root"
        password = getattr(self, f"{prefix}password") or self.rds_password or ""
        db = getattr(self, f"{prefix}database") or self.rds_database or "agent_verse"
        table = getattr(self, f"{prefix}table") or source_table
        ssl_mode = getattr(self, f"{prefix}ssl_mode") or self.rds_ssl_mode or ""

        return {
            "host": host,
            "port": port,
            "user": user,
            "password": password,
            "db": db,
            "table": table,
            "ssl_mode": ssl_mode,
        }

    def user_registration_rds_profile(self) -> dict:
        """RC read-replica profile for the user_registration table.

        The user_registration table lives in the same RC RDS as service-history, so this
        reuses the RDS_SERVICE_HISTORY_* connection and only overrides the table name.
        """
        host = self.rds_service_history_host or self.rds_host or "localhost"
        port = self.rds_service_history_port or self.rds_port or 3306
        user = self.rds_service_history_user or self.rds_user or "root"
        password = self.rds_service_history_password or self.rds_password or ""
        db = self.rds_service_history_database or self.rds_database or "RTO_SUMIT"
        ssl_mode = self.rds_service_history_ssl_mode or self.rds_ssl_mode or ""
        return {
            "host": host,
            "port": port,
            "user": user,
            "password": password,
            "db": db,
            "table": self.user_registration_rds_table or "user_registration",
            "ssl_mode": ssl_mode,
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
