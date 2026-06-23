from fastapi import APIRouter, status
from app.core.runtime import AgentRuntime
from app.schemas.task_schema import AgentTaskRequest, AgentTaskResponse

router = APIRouter()


@router.post("", response_model=AgentTaskResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_task(request: AgentTaskRequest) -> AgentTaskResponse:
    runtime = AgentRuntime()
    return await runtime.accept_task(request)
