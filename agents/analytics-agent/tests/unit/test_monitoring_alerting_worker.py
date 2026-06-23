import pytest

from app.config.settings import Settings
from app.domains.monitoring_alerting.worker import MonitoringWorker


class FakeCloudWatch:
    pass


class FakeAnalyzer:
    pass


class FakeAlerts:
    pass


def build_settings() -> Settings:
    return Settings(
        DATABASE_URL="postgresql://platform:platform@localhost:5432/agent_platform",
        REDIS_URL="redis://localhost:6379",
        KAFKA_BROKERS="localhost:9092",
        QDRANT_URL="http://localhost:6333",
        CLICKHOUSE_URL="http://localhost:8123",
        TEMPORAL_ADDRESS="localhost:7233",
        OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318",
        JWT_SECRET="local-dev",
        CLOUDWATCH_LOG_GROUPS="/aws/lambda/service-a,/aws/ecs/api-prod",
    )


def test_resolve_log_groups_defaults_to_configured_allowlist() -> None:
    worker = MonitoringWorker(build_settings(), FakeCloudWatch(), FakeAnalyzer(), FakeAlerts())

    assert worker._resolve_log_groups(None) == ["/aws/lambda/service-a", "/aws/ecs/api-prod"]


def test_resolve_log_groups_allows_configured_subset() -> None:
    worker = MonitoringWorker(build_settings(), FakeCloudWatch(), FakeAnalyzer(), FakeAlerts())

    assert worker._resolve_log_groups(["/aws/lambda/service-a"]) == ["/aws/lambda/service-a"]


def test_resolve_log_groups_rejects_group_outside_allowlist() -> None:
    worker = MonitoringWorker(build_settings(), FakeCloudWatch(), FakeAnalyzer(), FakeAlerts())

    with pytest.raises(ValueError, match="not in the configured allowlist"):
        worker._resolve_log_groups(["/aws/lambda/not-allowed"])
