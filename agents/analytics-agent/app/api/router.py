from fastapi import APIRouter
from app.api.v1.agent_routes import router as agent_router
from app.api.v1.health_routes import router as health_router
from app.api.v1.rc_system_routes import router as rc_system_router
from app.api.v1.task_routes import router as task_router
from app.domains.commander.routes import router as commander_router
from app.domains.business_analytics.routes import router as business_analytics_router
from app.domains.business_analytics.user_registration.routes import router as user_analytics_router
from app.domains.firebase.routes import router as firebase_router
from app.domains.google_ads.routes import router as google_ads_router
from app.domains.monitoring_alerting.routes import router as monitoring_alerting_router
from app.domains.scheduler.routes import router as scheduler_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(agent_router, prefix="/agent", tags=["agent"])
api_router.include_router(task_router, prefix="/tasks", tags=["tasks"])
api_router.include_router(rc_system_router, tags=["system-analytics"])
api_router.include_router(commander_router, prefix="/commander", tags=["commander"])
api_router.include_router(firebase_router, prefix="/firebase", tags=["firebase"])
api_router.include_router(google_ads_router, prefix="/google-ads", tags=["google-ads"])
api_router.include_router(
    business_analytics_router,
    prefix="/business-analytics",
    tags=["business-analytics"],
)
api_router.include_router(
    user_analytics_router,
    prefix="/business-analytics/users",
    tags=["business-analytics-users"],
)
api_router.include_router(
    monitoring_alerting_router,
    prefix="/monitoring-alerting",
    tags=["monitoring-alerting"],
)
api_router.include_router(scheduler_router, prefix="/scheduler", tags=["scheduler"])
