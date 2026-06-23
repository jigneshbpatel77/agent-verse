from datetime import datetime, timezone
from typing import Optional

from pydantic import BaseModel, Field


class LogEvent(BaseModel):
    source: str
    message: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    event_id: Optional[str] = None
    log_group: Optional[str] = None
    log_stream: Optional[str] = None


class AnalysisRequest(BaseModel):
    source: str = "manual"
    messages: list[str] = Field(min_length=1)


class PollRequest(BaseModel):
    log_groups: list[str] = Field(default_factory=list)


class AnalysisFinding(BaseModel):
    severity: str
    title: str
    summary: str
    evidence: list[str] = Field(default_factory=list)
    recommended_action: str
    confidence: float = Field(ge=0.0, le=1.0)


class AnalysisResult(BaseModel):
    source: str
    analyzed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    event_count: int
    highest_severity: str
    findings: list[AnalysisFinding] = Field(default_factory=list)


class PollResult(BaseModel):
    log_groups: list[str]
    event_count: int
    analysis: Optional[AnalysisResult] = None
