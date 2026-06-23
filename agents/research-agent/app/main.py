from fastapi import FastAPI
from app.config.settings import settings
from app.api.router import api_router
from app.observability.logging import configure_logging

app = FastAPI(title="Research Agent", version="1.0.0")

configure_logging()

app.include_router(api_router)

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "research-agent"}