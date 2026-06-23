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

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
