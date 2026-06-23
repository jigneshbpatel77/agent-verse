from app.core.agent import Agent
from app.schemas.task_schema import AgentTaskRequest, AgentTaskResponse
from app.utils.ids import new_id


class AgentRuntime:
    def __init__(self) -> None:
        self.agent = Agent()

    async def accept_task(self, request: AgentTaskRequest) -> AgentTaskResponse:
        task_id = new_id("task")
        await self.agent.handle(request)
        return AgentTaskResponse(task_id=task_id, status="accepted")
