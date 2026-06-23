from app.schemas.task_schema import AgentTaskRequest


class Agent:
    async def handle(self, request: AgentTaskRequest) -> None:
        # TODO: route task to domain workflow and emit Kafka lifecycle events.
        _ = request
