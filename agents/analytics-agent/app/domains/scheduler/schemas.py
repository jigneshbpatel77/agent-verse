from datetime import datetime

from pydantic import BaseModel, Field


class SchedulerRunLog(BaseModel):
    status: str
    started_at: datetime | None = None
    finished_at: datetime | None = None
    duration_ms: int | None = None
    rows_processed: int | None = None
    error: str | None = None


class SchedulerJob(BaseModel):
    key: str
    name: str
    source: str
    destination: str
    frequency: str
    enabled: bool
    status: str  # Running | Success | Failed | Idle
    last_run: datetime | None = None
    next_run: datetime | None = None
    last_duration_ms: int | None = None
    last_error: str | None = None


class SchedulerSummary(BaseModel):
    total_jobs: int
    running_now: int
    failed_24h: int
    success_rate: float  # 0-100


class SchedulerOverview(BaseModel):
    generated_at: datetime
    active: bool
    summary: SchedulerSummary
    jobs: list[SchedulerJob] = Field(default_factory=list)


class SchedulerJobLogs(BaseModel):
    job_key: str
    name: str
    runs: list[SchedulerRunLog] = Field(default_factory=list)
