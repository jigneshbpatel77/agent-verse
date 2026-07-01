from fastapi import APIRouter

from app.domains.commander.schemas import CommanderQueryRequest, CommanderQueryResponse
from app.domains.commander.service import AnalyticsCommanderService


router = APIRouter()


@router.post("/query", response_model=CommanderQueryResponse)
async def query_commander(request: CommanderQueryRequest) -> CommanderQueryResponse:
    return await AnalyticsCommanderService().analyze(request.prompt, request.days)
