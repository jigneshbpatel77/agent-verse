import asyncio
import json
from dataclasses import dataclass

from httpx import AsyncClient, HTTPStatusError, RequestError

from app.config.settings import Settings, get_settings
from app.domains.commander.schemas import (
    CommanderFinding,
    CommanderMetric,
    CommanderQueryResponse,
    CommanderSection,
    CommanderSeverity,
)
from app.domains.firebase.service import FirebaseService
from app.domains.firebase.schemas import FirebaseOverviewResponse
from app.domains.system_analytics.rc_service.schemas import RCHealthResponse
from app.domains.system_analytics.rc_service.service import RCSystemAnalyticsService, VEHICLEINFO_SYSTEM_SERVICES


SERVICE_KEYWORDS = {
    "rc": ("rc", "registration", "certificate"),
    "challan": ("challan",),
    "service-history": ("service history", "history"),
    "fastag": ("fastag",),
    "payments": ("payment", "payments"),
    "webhook": ("webhook",),
}


@dataclass(frozen=True)
class CommanderIntent:
    name: str
    service_keys: tuple[str, ...]
    include_firebase: bool
    include_system: bool
    include_crash: bool
    asks_slow: bool
    asks_health: bool


class AnalyticsCommanderService:
    async def analyze(self, prompt: str, days: int = 7) -> CommanderQueryResponse:
        settings = get_settings()
        normalized_prompt = " ".join(prompt.strip().split())
        intent = self._detect_intent(normalized_prompt)
        data_sources: list[str] = []
        sections: list[CommanderSection] = []
        findings: list[CommanderFinding] = []
        recommended_actions: list[str] = []
        limitations: list[str] = []

        system_health = await self._load_system_health(intent)
        if system_health:
            data_sources.append("System Analytics / Prometheus service health")
            service_section, service_findings, service_actions, service_limitations = self._system_section(system_health)
            sections.append(service_section)
            findings.extend(service_findings)
            recommended_actions.extend(service_actions)
            limitations.extend(service_limitations)

        firebase_overview = await self._load_firebase_overview(intent, days)
        if firebase_overview:
            data_sources.append("Firebase GA4 / Crashlytics overview")
            firebase_section, firebase_findings, firebase_actions, firebase_limitations = self._firebase_section(firebase_overview, intent)
            sections.append(firebase_section)
            findings.extend(firebase_findings)
            recommended_actions.extend(firebase_actions)
            limitations.extend(firebase_limitations)

        if not sections:
            limitations.append("No connected analytics source matched this request.")
            recommended_actions.append("Ask about RC health, service latency, Firebase app signals, or crash reports.")

        answer = self._compose_answer(intent, sections, findings, limitations)
        ai_provider = "deterministic"
        ai_model: str | None = None

        ai_answer = await self._compose_ai_answer(
            prompt=normalized_prompt,
            intent=intent,
            sections=sections,
            findings=findings,
            recommended_actions=_unique(recommended_actions),
            limitations=_unique(limitations),
            data_sources=data_sources,
            deterministic_answer=answer,
            settings=settings,
        )
        if ai_answer:
            answer = ai_answer
            ai_provider = settings.ai_provider.lower()
            ai_model = settings.openrouter_model

        return CommanderQueryResponse(
            prompt=normalized_prompt,
            intent=intent.name,
            answer=answer,
            ai_provider=ai_provider,
            ai_model=ai_model,
            data_sources=data_sources,
            sections=sections,
            findings=findings,
            recommended_actions=_unique(recommended_actions),
            limitations=_unique(limitations),
        )

    def _detect_intent(self, prompt: str) -> CommanderIntent:
        normalized = prompt.lower()
        include_crash = any(keyword in normalized for keyword in ("crash", "crashlytics", "exception"))
        include_firebase = include_crash or any(
            keyword in normalized
            for keyword in ("firebase", "ga4", "active user", "session", "screen", "event", "engagement", "yesterday")
        )
        include_system = any(
            keyword in normalized
            for keyword in ("health", "healthy", "slow", "latency", "p95", "p99", "cpu", "memory", "service", "system")
        )
        asks_slow = any(keyword in normalized for keyword in ("slow", "latency", "p95", "p99", "response time"))
        asks_health = any(keyword in normalized for keyword in ("health", "healthy", "status", "up", "down"))

        service_keys = [
            service_key
            for service_key, keywords in SERVICE_KEYWORDS.items()
            if any(keyword in normalized for keyword in keywords)
        ]

        if not service_keys and include_system:
            service_keys = list(VEHICLEINFO_SYSTEM_SERVICES)
        if not service_keys and not include_firebase:
            service_keys = ["rc"]
            include_system = True

        if include_crash:
            name = "crash_report"
        elif include_firebase and not include_system:
            name = "firebase_app_signals"
        elif service_keys:
            name = "service_health"
        else:
            name = "analytics_overview"

        return CommanderIntent(
            name=name,
            service_keys=tuple(service_keys),
            include_firebase=include_firebase,
            include_system=include_system or bool(service_keys),
            include_crash=include_crash,
            asks_slow=asks_slow,
            asks_health=asks_health,
        )

    async def _load_system_health(self, intent: CommanderIntent) -> list[RCHealthResponse]:
        if not intent.include_system or not intent.service_keys:
            return []

        service = RCSystemAnalyticsService()
        results = await asyncio.gather(
            *(service.get_health(service_key) for service_key in intent.service_keys),
            return_exceptions=True,
        )
        return [result for result in results if isinstance(result, RCHealthResponse)]

    async def _load_firebase_overview(self, intent: CommanderIntent, days: int) -> FirebaseOverviewResponse | None:
        if not intent.include_firebase:
            return None

        try:
            return await asyncio.to_thread(FirebaseService(get_settings()).overview, days)
        except Exception:
            return None

    def _system_section(
        self,
        health_rows: list[RCHealthResponse],
    ) -> tuple[CommanderSection, list[CommanderFinding], list[str], list[str]]:
        findings: list[CommanderFinding] = []
        actions: list[str] = []
        limitations: list[str] = []
        metrics: list[CommanderMetric] = []
        evidence: list[str] = []

        sorted_health_rows = sorted(
            health_rows,
            key=lambda health: (
                health.status == "unknown",
                -_connected_signal_count(health),
                VEHICLEINFO_SYSTEM_SERVICES.get(health.service_key, health.service_name),
            ),
        )

        for health in sorted_health_rows:
            display_name = VEHICLEINFO_SYSTEM_SERVICES.get(health.service_key, health.service_name)
            available_metric_count = _connected_signal_count(health)
            tone = _status_tone(health.status)
            metrics.append(CommanderMetric(label=display_name, value=health.status.title(), tone=tone))
            metrics.extend(
                [
                    CommanderMetric(label=f"{display_name} request rate", value=_format_rate(health.request_rate), tone="info"),
                    CommanderMetric(label=f"{display_name} P95", value=_format_ms(health.p95_latency_ms), tone=_latency_tone(health.p95_latency_ms)),
                    CommanderMetric(label=f"{display_name} error rate", value=_format_percent(health.error_rate), tone=_error_tone(health.error_rate)),
                ]
            )
            evidence.append(
                f"{display_name}: status={health.status}, request_rate={_format_rate(health.request_rate)}, "
                f"p95={_format_ms(health.p95_latency_ms)}, p99={_format_ms(health.p99_latency_ms)}, "
                f"signals={available_metric_count}/{len(health.raw_prometheus_queries)}."
            )

            if health.status in {"critical", "degraded"}:
                findings.append(
                    CommanderFinding(
                        severity=tone,
                        title=f"{display_name} is {health.status}",
                        detail=f"{display_name} needs review. Missing metrics: {len(health.missing_metrics)}.",
                        evidence=health.missing_metrics[:6],
                    )
                )
                actions.append(f"Review {display_name} Prometheus coverage and health-check route.")
            elif health.status == "unknown":
                limitations.append(
                    f"{display_name} does not have a connected health-check or Prometheus signal yet, so it is excluded from slowdown conclusions."
                )

        healthy_count = sum(1 for health in health_rows if health.status == "healthy")
        configured_count = sum(1 for health in health_rows if health.status != "unknown")
        summary = (
            f"{healthy_count}/{configured_count} connected services are healthy; "
            f"{len(health_rows) - configured_count} services are not configured yet."
            if health_rows
            else "No services were checked."
        )
        return CommanderSection(title="System analytics", summary=summary, metrics=metrics, evidence=evidence), findings, actions, limitations

    def _firebase_section(
        self,
        overview: FirebaseOverviewResponse,
        intent: CommanderIntent,
    ) -> tuple[CommanderSection, list[CommanderFinding], list[str], list[str]]:
        findings: list[CommanderFinding] = []
        actions: list[str] = []
        limitations: list[str] = []
        metrics: list[CommanderMetric] = []
        evidence: list[str] = []

        analytics = overview.analytics
        if analytics and analytics.daily:
            latest = analytics.daily[-1]
            previous = analytics.daily[-2] if len(analytics.daily) > 1 else None
            for metric_name, label in (
                ("activeUsers", "Active users"),
                ("sessions", "Sessions"),
                ("screenPageViews", "Screen views"),
                ("eventCount", "Events"),
                ("userEngagementDuration", "Engagement sec"),
            ):
                current = latest.metrics.get(metric_name)
                yesterday = previous.metrics.get(metric_name) if previous else None
                metrics.append(CommanderMetric(label=label, value=_format_number(current), tone="info"))
                if current is not None and yesterday is not None:
                    delta = current - yesterday
                    evidence.append(
                        f"{label}: {_format_number(current)} current, {_format_number(yesterday)} yesterday, "
                        f"{_format_signed_number(delta)} ({_format_delta_percent(current, yesterday)}) change."
                    )
        else:
            limitations.append("Firebase GA4 daily analytics are not available.")

        if overview.crashlytics:
            report_count = len(overview.crashlytics.reports)
            metrics.append(CommanderMetric(label="Crash reports", value=str(report_count), tone="warning" if report_count else "healthy"))
            evidence.append(f"Crashlytics returned {report_count} report(s).")
            if report_count:
                findings.append(
                    CommanderFinding(
                        severity="warning",
                        title="Crashlytics reports available",
                        detail="Crashlytics returned reports, but the current connector response does not include daily crash counts or affected route timing.",
                        evidence=[report.display_name or report.name for report in overview.crashlytics.reports[:5]],
                    )
                )
                actions.append("Extend Crashlytics ingestion with report timestamps, affected versions, and stack traces for daily crash reports.")
        elif intent.include_crash:
            limitations.append("Crashlytics is not connected, so a true yesterday crash report cannot be generated yet.")
            actions.append("Enable/connect Crashlytics API and expose daily crash counts before asking for crash trend reports.")

        for error in overview.errors:
            if "crashlytics" in error.lower():
                actions.append("Fix Crashlytics connector route/permissions, then rerun the crash report query.")
                limitations.append("Crashlytics detail is unavailable until the connector stops returning the reported error.")
            findings.append(
                CommanderFinding(
                    severity="warning",
                    title="Firebase connector warning",
                    detail=error,
                    evidence=[error],
                )
            )

        summary = (
            f"Firebase GA4 is available with {len(metrics)} daily metric signals; connector warnings: {len(overview.errors)}."
            if analytics
            else "Firebase analytics are partially available or unavailable."
        )
        return CommanderSection(title="Firebase app signals", summary=summary, metrics=metrics, evidence=evidence), findings, actions, limitations

    def _compose_answer(
        self,
        intent: CommanderIntent,
        sections: list[CommanderSection],
        findings: list[CommanderFinding],
        limitations: list[str],
    ) -> str:
        critical = [finding for finding in findings if finding.severity == "critical"]
        warnings = [finding for finding in findings if finding.severity in {"warning", "unknown"}]
        source_count = len(sections)
        metric_count = sum(len(section.metrics) for section in sections)
        available_metric_count = sum(
            1
            for section in sections
            for metric in section.metrics
            if metric.value not in {"Not available", "Unknown", ""}
        )

        if critical:
            return (
                f"Critical issue found in {critical[0].title}. "
                f"Evidence: {available_metric_count}/{metric_count} metrics available across {source_count} source(s). "
                f"Impact: {critical[0].detail} "
                f"Next: review the failing signal and rerun the query."
            )
        if warnings:
            return (
                f"Review needed: {warnings[0].title}. "
                f"Evidence: {available_metric_count}/{metric_count} metrics available across {source_count} source(s). "
                f"Context: {warnings[0].detail} "
                f"Next: fix the connector or missing signal before treating this as a complete report."
            )
        if intent.asks_slow and sections:
            system_section = next((section for section in sections if section.title == "System analytics"), None)
            summary = f" {system_section.summary}" if system_section else ""
            return (
                f"No connected VehicleInfo service is currently slow from available latency signals. "
                f"Evidence: {available_metric_count}/{metric_count} metrics available across {source_count} source(s)."
                f"{summary}"
            )
        if intent.asks_health and sections:
            system_section = next((section for section in sections if section.title == "System analytics"), None)
            if system_section:
                return (
                    f"Connected service health is available. "
                    f"Evidence: {system_section.summary} "
                    f"Signals: {available_metric_count}/{metric_count} metrics available."
                )
        if limitations and not sections:
            return "I could not complete this analysis from the connected sources."
        if sections:
            return (
                f"No critical issue found from connected signals. "
                f"Evidence: {available_metric_count}/{metric_count} metrics available across {source_count} source(s). "
                f"Context: {len(findings)} finding(s), {len(limitations)} limitation(s)."
            )
        return "No analytics result was generated."

    async def _compose_ai_answer(
        self,
        *,
        prompt: str,
        intent: CommanderIntent,
        sections: list[CommanderSection],
        findings: list[CommanderFinding],
        recommended_actions: list[str],
        limitations: list[str],
        data_sources: list[str],
        deterministic_answer: str,
        settings: Settings,
    ) -> str | None:
        provider = getattr(settings, "ai_provider", "deterministic").lower()
        if provider != "openrouter":
            return None

        api_key = getattr(settings, "provider_api_key", None)
        if not api_key:
            limitations.append("OpenRouter is selected but PROVIDER_API_KEY is not configured.")
            return None

        payload = {
            "question": prompt,
            "intent": intent.name,
            "data_sources": data_sources,
            "deterministic_summary": deterministic_answer,
            "sections": [section.model_dump(mode="json") for section in sections],
            "findings": [finding.model_dump(mode="json") for finding in findings],
            "recommended_actions": recommended_actions,
            "limitations": limitations,
        }
        system_prompt = (
            "You are the Analytics Commander for a VehicleInfo analytics agent. "
            "Answer using only the provided JSON evidence. Do not invent metrics, incidents, "
            "root causes, dates, or service names. If evidence is missing, say exactly what is missing. "
            "Keep the response concise, structured, operational, and production-friendly. Start with a direct verdict. "
            "Include exact counts and statistics from the JSON whenever available, such as healthy services, "
            "connected signals, request rate, latency, error rate, Firebase current/yesterday/change values, "
            "findings count, and limitations count. Avoid theoretical explanation. "
            "Return 3 to 5 short evidence-backed sentences, each under 180 characters where possible. "
            "Use this shape: Verdict. Evidence with numbers. Context or impact. Next action. Known limitation if any."
        )
        user_prompt = json.dumps(payload, ensure_ascii=True, separators=(",", ":"))

        try:
            async with AsyncClient(
                base_url=getattr(settings, "openrouter_base_url", "https://openrouter.ai/api/v1"),
                timeout=getattr(settings, "commander_llm_timeout_seconds", 30),
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "HTTP-Referer": "http://localhost:3000",
                    "X-Title": "AgentVerse Analytics Commander",
                },
            ) as client:
                response = await client.post(
                    "/chat/completions",
                    json={
                        "model": getattr(settings, "openrouter_model", "openrouter/auto"),
                        "temperature": 0.1,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": user_prompt},
                        ],
                    },
                )
                response.raise_for_status()
        except (HTTPStatusError, RequestError, ValueError) as exc:
            limitations.append(f"OpenRouter analysis unavailable: {exc.__class__.__name__}.")
            return None

        content = response.json().get("choices", [{}])[0].get("message", {}).get("content")
        if not isinstance(content, str) or not content.strip():
            limitations.append("OpenRouter returned an empty commander response.")
            return None
        return content.strip()


def _status_tone(status: str) -> CommanderSeverity:
    if status == "healthy":
        return "healthy"
    if status in {"critical"}:
        return "critical"
    if status in {"degraded"}:
        return "warning"
    return "unknown"


def _latency_tone(value: float | None) -> CommanderSeverity:
    if value is None:
        return "unknown"
    if value >= 1000:
        return "critical"
    if value >= 800:
        return "warning"
    return "healthy"


def _error_tone(value: float | None) -> CommanderSeverity:
    if value is None:
        return "unknown"
    if value >= 0.05:
        return "critical"
    if value >= 0.01:
        return "warning"
    return "healthy"


def _format_number(value: float | None) -> str:
    if value is None:
        return "Not available"
    return f"{value:,.0f}"


def _format_signed_number(value: float | None) -> str:
    if value is None:
        return "Not available"
    return f"{value:+,.0f}"


def _format_delta_percent(current: float | None, previous: float | None) -> str:
    if current is None or previous is None or previous == 0:
        return "trend unavailable"
    return f"{((current - previous) / previous) * 100:+.1f}%"


def _format_rate(value: float | None) -> str:
    if value is None:
        return "Not available"
    return f"{value:.2f} req/s"


def _format_ms(value: float | None) -> str:
    if value is None:
        return "Not available"
    return f"{value:.1f} ms"


def _format_percent(value: float | None) -> str:
    if value is None:
        return "Not available"
    return f"{value * 100:.2f}%"


def _unique(values: list[str]) -> list[str]:
    return list(dict.fromkeys(value for value in values if value))


def _connected_signal_count(health: RCHealthResponse) -> int:
    return max(len(health.raw_prometheus_queries) - len(health.missing_metrics), 0)
