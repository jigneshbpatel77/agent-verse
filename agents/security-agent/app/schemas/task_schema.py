from enum import StrEnum
from pydantic import BaseModel, Field


class TaskPriority(StrEnum):
    low = "low"
    normal = "normal"
    high = "high"
    critical = "critical"


class AgentTaskRequest(BaseModel):
    tenant_id: str = Field(min_length=1)
    workflow_id: str | None = None
    task_type: str = Field(min_length=1)
    payload: dict = Field(default_factory=dict)
    priority: TaskPriority = TaskPriority.normal


class AgentTaskResponse(BaseModel):
    task_id: str
    status: str
