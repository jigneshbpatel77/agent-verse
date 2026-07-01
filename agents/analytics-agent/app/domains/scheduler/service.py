"""Scheduler-monitor service: combines the static job registry with real run
history from ``scheduler_runs`` to produce the monitor overview and per-job logs.
"""

from datetime import UTC, datetime, timedelta

from app.config.settings import Settings
from app.domains.scheduler import store
from app.domains.scheduler.schemas import (
    SchedulerJob,
    SchedulerJobLogs,
    SchedulerOverview,
    SchedulerRunLog,
    SchedulerSummary,
)

# job_key -> friendly job metadata. interval_seconds drives the next-run estimate.
JOB_REGISTRY = [
    {
        "key": "warehouse_sync",
        "name": "Payment / Warehouse Sync",
        "source": "RDS (MySQL)",
        "destination": "DuckDB warehouse",
        "frequency": "15 min",
        "interval_seconds": 900,
        "enabled_attr": "enable_business_analytics_sync",
    },
    {
        "key": "policybazaar_email",
        "name": "Insurance Email Ingestion",
        "source": "Gmail",
        "destination": "DuckDB warehouse",
        "frequency": "Daily",
        "interval_seconds": 86_400,
        "enabled_attr": "enable_policybazaar_email_ingestion",
    },
    {
        "key": "cloudwatch_poller",
        "name": "Monitoring / CloudWatch Poller",
        "source": "AWS CloudWatch",
        "destination": "Alert store",
        "frequency": "Hourly",
        "interval_seconds": 3_600,
        "enabled_attr": "enable_cloudwatch_poller",
    },
    {
        "key": "funnel_sync",
        "name": "Funnel Sync",
        "source": "Firebase (GA4)",
        "destination": "DuckDB warehouse",
        "frequency": "Daily",
        "interval_seconds": 86_400,
        "enabled_attr": "enable_funnel_sync",
    },
]


def _job_status(enabled: bool, latest: dict | None) -> str:
    if latest and latest.get("status") == "Running":
        return "Running"
    if latest and latest.get("status") == "Failed":
        return "Failed"
    if latest and latest.get("status") == "Success":
        return "Success"
    return "Idle"


def _next_run(latest: dict | None, interval_seconds: int, enabled: bool) -> datetime | None:
    if not enabled:
        return None
    anchor = None
    if latest and latest.get("finished_at"):
        anchor = latest["finished_at"]
    elif latest and latest.get("started_at"):
        anchor = latest["started_at"]
    if anchor is None:
        return datetime.now(UTC) + timedelta(seconds=interval_seconds)
    if anchor.tzinfo is None:
        anchor = anchor.replace(tzinfo=UTC)
    return anchor + timedelta(seconds=interval_seconds)


def build_overview(settings: Settings) -> SchedulerOverview:
    jobs: list[SchedulerJob] = []
    for definition in JOB_REGISTRY:
        enabled = bool(getattr(settings, definition["enabled_attr"], False))
        latest = store.latest_run(definition["key"])
        jobs.append(
            SchedulerJob(
                key=definition["key"],
                name=definition["name"],
                source=definition["source"],
                destination=definition["destination"],
                frequency=definition["frequency"],
                enabled=enabled,
                status=_job_status(enabled, latest),
                last_run=(latest or {}).get("started_at"),
                next_run=_next_run(latest, definition["interval_seconds"], enabled),
                last_duration_ms=(latest or {}).get("duration_ms"),
                last_error=(latest or {}).get("error"),
            )
        )

    aggregate = store.counts()
    total_finished = aggregate["total_finished"]
    success_rate = (aggregate["total_success"] / total_finished * 100.0) if total_finished else 0.0

    summary = SchedulerSummary(
        total_jobs=len(jobs),
        running_now=aggregate["running"],
        failed_24h=aggregate["failed_24h"],
        success_rate=round(success_rate, 1),
    )

    return SchedulerOverview(
        generated_at=datetime.now(UTC),
        active=any(job.enabled for job in jobs),
        summary=summary,
        jobs=jobs,
    )


def job_logs(job_key: str, limit: int = 20) -> SchedulerJobLogs:
    definition = next((item for item in JOB_REGISTRY if item["key"] == job_key), None)
    name = definition["name"] if definition else job_key
    runs = [SchedulerRunLog(**run) for run in store.recent_runs(job_key, limit)]
    return SchedulerJobLogs(job_key=job_key, name=name, runs=runs)
