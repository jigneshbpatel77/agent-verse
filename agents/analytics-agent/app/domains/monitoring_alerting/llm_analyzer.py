import json
from typing import Any

from pydantic import ValidationError

from app.config.settings import Settings
from app.domains.monitoring_alerting.alerts import SEVERITY_RANK
from app.domains.monitoring_alerting.llm_adapters import LogAnalysisLLM, build_log_analysis_adapter
from app.domains.monitoring_alerting.schemas import AnalysisFinding, AnalysisResult, LogEvent

SYSTEM_PROMPT = """You are an on-call production monitoring analyst.
Analyze logs for incidents, regressions, security signals, customer impact, and alert-worthy anomalies.
Return only strict JSON with this shape:
{
  "findings": [
    {
      "severity": "none|low|medium|high|critical",
      "title": "short title",
      "summary": "what is happening and likely impact",
      "evidence": ["short quoted or paraphrased log evidence"],
      "recommended_action": "specific next step",
      "confidence": 0.0
    }
  ]
}
Use severity "none" only when there is no meaningful issue. Prefer fewer high-signal findings."""


class LLMAnalyzer:
    def __init__(self, settings: Settings, adapter: LogAnalysisLLM | None = None) -> None:
        self._settings = settings
        self._adapter = adapter or build_log_analysis_adapter(settings)

    def analyze(self, source: str, events: list[LogEvent]) -> AnalysisResult:
        if not events:
            return AnalysisResult(
                source=source,
                event_count=0,
                highest_severity="none",
                findings=[],
            )

        prompt = self._build_prompt(events)
        content = self._adapter.analyze_logs(SYSTEM_PROMPT, prompt)
        findings = self._parse_findings(content)
        highest = max(
            (finding.severity for finding in findings),
            default="none",
            key=lambda severity: SEVERITY_RANK.get(severity, 0),
        )
        return AnalysisResult(
            source=source,
            event_count=len(events),
            highest_severity=highest,
            findings=findings,
        )

    def _build_prompt(self, events: list[LogEvent]) -> str:
        lines: list[str] = []
        current_size = 0
        for event in events:
            stream = f" {event.log_stream}" if event.log_stream else ""
            line = f"[{event.timestamp.isoformat()}] {event.log_group or event.source}{stream}: {event.message}"
            if current_size + len(line) > self._settings.max_log_chars:
                lines.append("[truncated: max log character budget reached]")
                break
            lines.append(line)
            current_size += len(line)

        return "Analyze this log batch:\n\n" + "\n".join(lines)

    def _parse_findings(self, content: str) -> list[AnalysisFinding]:
        try:
            parsed: dict[str, Any] = json.loads(content)
            raw_findings = parsed.get("findings", [])
            findings = [AnalysisFinding.model_validate(item) for item in raw_findings]
        except (json.JSONDecodeError, TypeError, ValidationError) as exc:
            findings = [
                AnalysisFinding(
                    severity="medium",
                    title="LLM analysis parse failure",
                    summary=f"The LLM returned an invalid analysis payload: {exc}",
                    evidence=[content[:500]],
                    recommended_action="Inspect the model output and retry analysis.",
                    confidence=0.5,
                )
            ]

        return findings or [
            AnalysisFinding(
                severity="none",
                title="No alert-worthy issue found",
                summary="The analyzed logs did not contain a clear incident signal.",
                evidence=[],
                recommended_action="Continue monitoring.",
                confidence=0.8,
            )
        ]
