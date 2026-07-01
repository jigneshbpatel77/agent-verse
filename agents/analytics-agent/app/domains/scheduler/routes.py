from fastapi import APIRouter, Query

from app.config.settings import get_settings
from app.domains.scheduler import service
from app.domains.scheduler.schemas import SchedulerJobLogs, SchedulerOverview

router = APIRouter()


@router.get("/jobs", response_model=SchedulerOverview)
def scheduler_jobs() -> SchedulerOverview:
    return service.build_overview(get_settings())


@router.get("/jobs/{job_key}/logs", response_model=SchedulerJobLogs)
def scheduler_job_logs(job_key: str, limit: int = Query(default=20, ge=1, le=100)) -> SchedulerJobLogs:
    return service.job_logs(job_key, limit)
