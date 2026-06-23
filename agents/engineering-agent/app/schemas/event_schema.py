from pydantic import BaseModel, Field


class AgentEvent(BaseModel):
    event_id: str
    topic: str
    tenant_id: str
    aggregate_id: str
    payload: dict = Field(default_factory=dict)
    occurred_at: str
