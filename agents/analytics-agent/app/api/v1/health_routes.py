from fastapi import APIRouter
from app.config.settings import get_settings

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    settings = get_settings()
    return {"service": settings.service_name, "status": "ok"}
