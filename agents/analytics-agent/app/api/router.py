from fastapi import APIRouter
from app.api.v1.agent_routes import router as agent_router
from app.api.v1.health_routes import router as health_router
from app.api.v1.rc_system_routes import router as rc_system_router
from app.api.v1.task_routes import router as task_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(agent_router, prefix="/agent", tags=["agent"])
api_router.include_router(task_router, prefix="/tasks", tags=["tasks"])
api_router.include_router(rc_system_router, tags=["system-analytics"])
