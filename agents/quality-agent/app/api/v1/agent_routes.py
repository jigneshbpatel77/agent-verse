from fastapi import APIRouter
from app.config.settings import get_settings

router = APIRouter()


@router.get("")
async def agent_metadata() -> dict[str, str]:
    settings = get_settings()
    return {"agent": settings.service_name, "capability": "placeholder"}
