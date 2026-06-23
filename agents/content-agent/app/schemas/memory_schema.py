from pydantic import BaseModel, Field


class MemoryRecord(BaseModel):
    agent_id: str
    session_id: str | None = None
    key: str
    value: dict = Field(default_factory=dict)
