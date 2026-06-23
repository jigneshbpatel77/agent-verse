from app.config.settings import Settings
from app.domains.monitoring_alerting.llm_adapters import OpenAICompatibleChatAdapter, build_log_analysis_adapter
from app.domains.monitoring_alerting.llm_analyzer import LLMAnalyzer
from app.domains.monitoring_alerting.schemas import LogEvent


class FakeAdapter:
    def analyze_logs(self, system_prompt: str, user_prompt: str) -> str:
        assert "production monitoring analyst" in system_prompt
        assert "ERROR database timeout" in user_prompt
        return """
        {
          "findings": [
            {
              "severity": "high",
              "title": "Database timeout",
              "summary": "Database calls are timing out.",
              "evidence": ["ERROR database timeout"],
              "recommended_action": "Check database latency and connection pool saturation.",
              "confidence": 0.91
            }
          ]
        }
        """


def build_settings(**overrides: object) -> Settings:
    values = {
        "DATABASE_URL": "postgresql://platform:platform@localhost:5432/agent_platform",
        "REDIS_URL": "redis://localhost:6379",
        "KAFKA_BROKERS": "localhost:9092",
        "QDRANT_URL": "http://localhost:6333",
        "CLICKHOUSE_URL": "http://localhost:8123",
        "TEMPORAL_ADDRESS": "localhost:7233",
        "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4318",
        "JWT_SECRET": "local-dev",
    }
    values.update(overrides)
    return Settings(**values)


def test_analyzer_uses_injected_adapter() -> None:
    analyzer = LLMAnalyzer(build_settings(), adapter=FakeAdapter())

    result = analyzer.analyze("test", [LogEvent(source="test", message="ERROR database timeout")])

    assert result.highest_severity == "high"
    assert result.findings[0].title == "Database timeout"


def test_grok_provider_builds_openai_compatible_adapter() -> None:
    settings = build_settings(
        LLM_PROVIDER="grok",
        XAI_API_KEY="test-key",
        XAI_BASE_URL="https://api.x.ai/v1",
        XAI_MODEL="grok-test",
    )

    adapter = build_log_analysis_adapter(settings)

    assert isinstance(adapter, OpenAICompatibleChatAdapter)
