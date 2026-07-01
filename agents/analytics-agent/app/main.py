import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.router import api_router
from app.config.settings import get_settings
from app.domains.business_analytics.sync import AnalyticsSyncPipeline
from app.domains.monitoring_alerting.worker import MonitoringWorker
from app.observability.middleware import install_observability

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    app.state.monitoring_worker = None
    app.state.sync_pipeline = None

    if settings.enable_cloudwatch_poller:
        logger.info("Starting analytics monitoring-alerting CloudWatch poller")
        app.state.monitoring_worker = MonitoringWorker.from_settings(settings)
        app.state.monitoring_worker.start()

    if settings.enable_business_analytics_sync:
        logger.info("Starting business analytics warehouse sync pipeline")
        pipeline = AnalyticsSyncPipeline(interval_seconds=settings.business_analytics_sync_interval_seconds)
        pipeline.start()
        app.state.sync_pipeline = pipeline

    try:
        yield
    finally:
        if app.state.sync_pipeline is not None:
            logger.info("Stopping business analytics warehouse sync pipeline")
            await app.state.sync_pipeline.stop()

        if app.state.monitoring_worker is not None:
            logger.info("Stopping CloudWatch poller")
            await app.state.monitoring_worker.stop()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.service_name, version="0.1.0", lifespan=lifespan)

    # Allow CORS for Next.js console queries.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    install_observability(app)
    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()
