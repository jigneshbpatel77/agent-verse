import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    service_name: str = "engineering-agent"
    environment: str = os.getenv("ENVIRONMENT", "development")
    database_url: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/engineering_agent")
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    kafka_brokers: str = os.getenv("KAFKA_BROKERS", "localhost:9092")
    qdrant_url: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    clickhouse_url: str = os.getenv("CLICKHOUSE_URL", "clickhouse://localhost:8123")

settings = Settings()