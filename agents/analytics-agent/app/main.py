import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from app.api.router import api_router
from app.config.settings import get_settings
from app.domains.monitoring_alerting.worker import MonitoringWorker
from app.observability.middleware import install_observability

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    app.state.monitoring_worker = None

    if settings.enable_cloudwatch_poller:
        logger.info("Starting analytics monitoring-alerting CloudWatch poller")
        app.state.monitoring_worker = MonitoringWorker.from_settings(settings)
        app.state.monitoring_worker.start()

    try:
        yield
    finally:
        if app.state.monitoring_worker is not None:
            await app.state.monitoring_worker.stop()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.service_name, version="0.1.0", lifespan=lifespan)
    install_observability(app)
    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()
