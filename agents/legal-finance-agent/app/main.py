from fastapi import FastAPI
from app.api.router import api_router
from app.config.settings import get_settings
from app.observability.middleware import install_observability


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.service_name, version="0.1.0")
    install_observability(app)
    app.include_router(api_router, prefix="/api/v1")
    return app


app = create_app()
