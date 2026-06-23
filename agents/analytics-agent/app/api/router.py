from fastapi import APIRouter
from app.api.v1 import health_routes, task_routes, agent_routes

api_router = APIRouter()
api_router.include_router(health_routes.router, prefix="/health", tags=["health"])
api_router.include_router(task_routes.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(agent_routes.router, prefix="/agent", tags=["agent"])