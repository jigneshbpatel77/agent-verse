from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field


CommanderSeverity = Literal["healthy", "info", "warning", "critical", "unknown"]


class CommanderQueryRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=2000)
    days: int = Field(default=7, ge=1, le=30)


class CommanderMetric(BaseModel):
    label: str
    value: str
    tone: CommanderSeverity = "info"


class CommanderSection(BaseModel):
    title: str
    summary: str
    metrics: list[CommanderMetric] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)


class CommanderFinding(BaseModel):
    severity: CommanderSeverity
    title: str
    detail: str
    evidence: list[str] = Field(default_factory=list)


class CommanderQueryResponse(BaseModel):
    prompt: str
    intent: str
    answer: str
    ai_provider: str = "deterministic"
    ai_model: str | None = None
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    data_sources: list[str] = Field(default_factory=list)
    sections: list[CommanderSection] = Field(default_factory=list)
    findings: list[CommanderFinding] = Field(default_factory=list)
    recommended_actions: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
