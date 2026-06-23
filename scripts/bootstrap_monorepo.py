import os
import sys

def create_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content.strip())
    print(f"Created file: {path}")

def main():
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    print(f"Bootstrapping monorepo at: {root}")

    # Tech stack mapping
    py_agents = [
        "analytics-agent", "research-agent", "architecture-agent", "engineering-agent",
        "security-agent", "quality-agent", "content-agent", "legal-finance-agent"
    ]
    nestjs_agents = [
        "orchestration-agent", "product-agent", "devops-agent", "growth-agent", "support-agent"
    ]
    packages = [
        "event-contracts", "shared-types", "api-client", "kafka-client", "redis-client",
        "postgres-client", "qdrant-client", "clickhouse-client", "temporal-client",
        "knowledge-sdk", "memory-sdk", "agent-sdk", "approval-sdk", "observability-sdk",
        "prompt-library", "model-router", "config"
    ]
    services = [
        "knowledge-service", "memory-service", "approval-service", "audit-service",
        "notification-service", "file-service", "report-service", "integration-service"
    ]
    apps = [
        "web-console", "api-gateway", "orchestrator-service"
    ]

    # Create general dir structures
    infra_dirs = ["docker", "kubernetes", "helm", "terraform", "kafka", "redis", "postgres", "qdrant", "clickhouse", "temporal", "prometheus", "grafana", "loki", "otel"]
    data_dirs = ["postgres", "clickhouse", "qdrant", "dbt", "migrations"]
    doc_dirs = ["architecture", "agents", "events", "api", "database", "memory", "knowledge", "deployment", "runbooks"]

    for d in infra_dirs:
        os.makedirs(os.path.join(root, "infra", d), exist_ok=True)
    for d in data_dirs:
        os.makedirs(os.path.join(root, "data", d), exist_ok=True)
    for d in doc_dirs:
        os.makedirs(os.path.join(root, "docs", d), exist_ok=True)

    # 1. Scaffolding Python Agents
    for agent in py_agents:
        agent_dir = os.path.join(root, "agents", agent)
        print(f"Scaffolding Python Agent: {agent}")

        # pyproject.toml
        pyproject_content = f"""
[tool.poetry]
name = "{agent}"
version = "0.1.0"
description = "FastAPI AI Agent for {agent.replace('-', ' ').title()}"
authors = ["AI Agent Platform Team"]

[tool.poetry.dependencies]
python = "^3.12"
fastapi = "^0.111.0"
uvicorn = "^0.30.1"
langgraph = "^0.0.60"
pydantic = "^2.7.4"
sqlalchemy = "^2.0.31"
alembic = "^1.13.1"
aiokafka = "^0.10.0"
redis = "^5.0.6"
qdrant-client = "^1.9.1"
clickhouse-connect = "^0.7.15"
opentelemetry-api = "^1.25.0"
opentelemetry-sdk = "^1.25.0"
opentelemetry-instrumentation-fastapi = "^0.46b0"

[build-system]
requires = ["poetry-core>=1.0.0"]
build-backend = "poetry.core.masonry.api"
"""
        create_file(os.path.join(agent_dir, "pyproject.toml"), pyproject_content)

        # Dockerfile
        docker_content = f"""
FROM python:3.12-slim
WORKDIR /app
COPY pyproject.toml README.md /app/
RUN pip install poetry && poetry config virtualenvs.create false && poetry install --no-dev
COPY . /app/
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
"""
        create_file(os.path.join(agent_dir, "Dockerfile"), docker_content)

        # README.md
        readme_content = f"""
# {agent.replace('-', ' ').title()}
FastAPI agent responsible for domain-driven tasks in the Vehicle Information Platform.

## Run Locally
```bash
poetry install
poetry run uvicorn app.main:app --reload --port 8000
```
"""
        create_file(os.path.join(agent_dir, "README.md"), readme_content)

        # .env.example
        env_content = f"""
SERVICE_NAME={agent}
ENVIRONMENT=development
PORT=8000
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/{agent.replace('-', '_')}
REDIS_URL=redis://localhost:6379/0
KAFKA_BROKERS=localhost:9092
QDRANT_URL=http://localhost:6333
CLICKHOUSE_URL=clickhouse://localhost:8123
TEMPORAL_ADDRESS=localhost:7233
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
JWT_SECRET=supersecretjwtsecret
"""
        create_file(os.path.join(agent_dir, ".env.example"), env_content)

        # Main core files
        create_file(os.path.join(agent_dir, "app", "main.py"), f"""
from fastapi import FastAPI
from app.config.settings import settings
from app.api.router import api_router
from app.observability.logging import configure_logging

app = FastAPI(title="{agent.replace('-', ' ').title()}", version="1.0.0")

configure_logging()

app.include_router(api_router)

@app.get("/health")
async def health_check():
    return {{"status": "ok", "service": "{agent}"}}
""")

        # Config files
        create_file(os.path.join(agent_dir, "app", "config", "settings.py"), f"""
import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    service_name: str = "{agent}"
    environment: str = os.getenv("ENVIRONMENT", "development")
    database_url: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/{agent.replace('-', '_')}")
    redis_url: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    kafka_brokers: str = os.getenv("KAFKA_BROKERS", "localhost:9092")
    qdrant_url: str = os.getenv("QDRANT_URL", "http://localhost:6333")
    clickhouse_url: str = os.getenv("CLICKHOUSE_URL", "clickhouse://localhost:8123")

settings = Settings()
""")
        create_file(os.path.join(agent_dir, "app", "config", "logging.py"), "# Logging config placeholder\ndef configure_logging(): pass")
        create_file(os.path.join(agent_dir, "app", "config", "constants.py"), "# Constants placeholder\nAGENT_NAME = '" + agent + "'")

        # API
        create_file(os.path.join(agent_dir, "app", "api", "router.py"), """
from fastapi import APIRouter
from app.api.v1 import health_routes, task_routes, agent_routes

api_router = APIRouter()
api_router.include_router(health_routes.router, prefix="/health", tags=["health"])
api_router.include_router(task_routes.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(agent_routes.router, prefix="/agent", tags=["agent"])
""")
        create_file(os.path.join(agent_dir, "app", "api", "v1", "health_routes.py"), "from fastapi import APIRouter\nrouter = APIRouter()\n@router.get('/')\ndef get_health(): return {'status': 'healthy'}")
        create_file(os.path.join(agent_dir, "app", "api", "v1", "task_routes.py"), "from fastapi import APIRouter\nrouter = APIRouter()\n@router.post('/')\ndef run_task(): return {'task_id': 'placeholder'}")
        create_file(os.path.join(agent_dir, "app", "api", "v1", "agent_routes.py"), "from fastapi import APIRouter\nrouter = APIRouter()")

        # Core
        create_file(os.path.join(agent_dir, "app", "core", "agent.py"), "# Agent executor logic\nclass AIAgent:\n    def run(self): pass")
        create_file(os.path.join(agent_dir, "app", "core", "runtime.py"), "# Agent runtime logic")
        create_file(os.path.join(agent_dir, "app", "core", "task_router.py"), "# Task router logic")
        create_file(os.path.join(agent_dir, "app", "core", "workflow_manager.py"), "# Workflow coordination")
        create_file(os.path.join(agent_dir, "app", "core", "dependency_container.py"), "# Dependency injection")

        # Domains / Workflows
        create_file(os.path.join(agent_dir, "app", "domains", "README.md"), f"# Domain modules for {agent}")
        create_file(os.path.join(agent_dir, "app", "workflows", "README.md"), f"# Workflows for {agent}")

        # LangGraph
        create_file(os.path.join(agent_dir, "app", "langgraph", "graph_builder.py"), "# LangGraph pipeline configuration")
        create_file(os.path.join(agent_dir, "app", "langgraph", "nodes", "__init__.py"), "")
        create_file(os.path.join(agent_dir, "app", "langgraph", "states", "__init__.py"), "")

        # Events
        create_file(os.path.join(agent_dir, "app", "events", "topics.py"), "# Kafka topics mapping")
        create_file(os.path.join(agent_dir, "app", "events", "producer.py"), "# Kafka Producer client")
        create_file(os.path.join(agent_dir, "app", "events", "consumer.py"), "# Kafka Consumer client")
        create_file(os.path.join(agent_dir, "app", "events", "handlers", "__init__.py"), "")
        create_file(os.path.join(agent_dir, "app", "events", "contracts", "__init__.py"), "")

        # Memory / Knowledge
        create_file(os.path.join(agent_dir, "app", "memory", "memory_service.py"), "# Redis state/memory service")
        create_file(os.path.join(agent_dir, "app", "memory", "short_term_memory.py"), "")
        create_file(os.path.join(agent_dir, "app", "memory", "long_term_memory.py"), "")
        create_file(os.path.join(agent_dir, "app", "memory", "working_context.py"), "")
        create_file(os.path.join(agent_dir, "app", "knowledge", "rag_service.py"), "# Qdrant vector retrieval service")
        create_file(os.path.join(agent_dir, "app", "knowledge", "retriever.py"), "")
        create_file(os.path.join(agent_dir, "app", "knowledge", "embedder.py"), "")
        create_file(os.path.join(agent_dir, "app", "knowledge", "chunker.py"), "")
        create_file(os.path.join(agent_dir, "app", "knowledge", "indexer.py"), "")
        create_file(os.path.join(agent_dir, "app", "knowledge", "collections.py"), "")

        # Models
        create_file(os.path.join(agent_dir, "app", "models", "llm_client.py"), "")
        create_file(os.path.join(agent_dir, "app", "models", "model_router.py"), "")
        create_file(os.path.join(agent_dir, "app", "models", "embedding_model.py"), "")

        # Integrations
        create_file(os.path.join(agent_dir, "app", "integrations", "postgres_client.py"), "")
        create_file(os.path.join(agent_dir, "app", "integrations", "redis_client.py"), "")
        create_file(os.path.join(agent_dir, "app", "integrations", "qdrant_client.py"), "")
        create_file(os.path.join(agent_dir, "app", "integrations", "clickhouse_client.py"), "")
        create_file(os.path.join(agent_dir, "app", "integrations", "kafka_client.py"), "")

        # Repositories / Schemas
        create_file(os.path.join(agent_dir, "app", "repositories", "task_repository.py"), "")
        create_file(os.path.join(agent_dir, "app", "repositories", "memory_repository.py"), "")
        create_file(os.path.join(agent_dir, "app", "repositories", "audit_repository.py"), "")
        create_file(os.path.join(agent_dir, "app", "schemas", "task_schema.py"), "")
        create_file(os.path.join(agent_dir, "app", "schemas", "event_schema.py"), "")
        create_file(os.path.join(agent_dir, "app", "schemas", "memory_schema.py"), "")
        create_file(os.path.join(agent_dir, "app", "schemas", "common.py"), "")

        # Observability / Utils
        create_file(os.path.join(agent_dir, "app", "observability", "tracing.py"), "")
        create_file(os.path.join(agent_dir, "app", "observability", "metrics.py"), "")
        create_file(os.path.join(agent_dir, "app", "observability", "logging.py"), "")
        create_file(os.path.join(agent_dir, "app", "observability", "middleware.py"), "")
        create_file(os.path.join(agent_dir, "app", "utils", "ids.py"), "")
        create_file(os.path.join(agent_dir, "app", "utils", "datetime.py"), "")
        create_file(os.path.join(agent_dir, "app", "utils", "errors.py"), "")

        # Tests
        create_file(os.path.join(agent_dir, "tests", "unit", "test_placeholder.py"), "def test_noop(): pass")
        create_file(os.path.join(agent_dir, "tests", "integration", "__init__.py"), "")
        create_file(os.path.join(agent_dir, "tests", "e2e", "__init__.py"), "")

        # Alembic
        create_file(os.path.join(agent_dir, "alembic", "versions", ".keep"), "")
        create_file(os.path.join(agent_dir, "alembic", "env.py"), "# Alembic env setup placeholder")

        # Specialized folders
        if agent == "analytics-agent":
            domains = ["system_analytics", "business_analytics", "monitoring_alerting", "root_cause_analysis", "decision_intelligence", "agent_optimization"]
            for d in domains:
                create_file(os.path.join(agent_dir, "app", "domains", d, "__init__.py"), f"# System domain: {d}")
        elif agent == "engineering-agent":
            workers = ["ui_ux_worker", "backend_worker", "api_documentation_worker", "frontend_integration_worker", "android_worker", "ios_worker"]
            for w in workers:
                create_file(os.path.join(agent_dir, "app", "domains", w, "__init__.py"), f"# Specialized worker: {w}")

    # 2. Scaffolding NestJS Agents
    for agent in nestjs_agents:
        agent_dir = os.path.join(root, "agents", agent)
        print(f"Scaffolding NestJS Agent: {agent}")

        # package.json
        package_content = f"""
{{
  "name": "@agents/{agent}",
  "version": "0.1.0",
  "private": true,
  "scripts": {{
    "build": "nest build",
    "format": "prettier --write \\"src/**/*.ts\\" \\"test/**/*.ts\\"",
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:debug": "nest start --debug --watch",
    "start:prod": "node dist/main",
    "lint": "eslint \\"{{src,apps,libs,test}}/**/*.ts\\" --fix",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand",
    "test:e2e": "jest --config ./test/jest-e2e.json"
  }},
  "dependencies": {{
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0",
    "@nestjs/microservices": "^10.0.0",
    "@nestjs/platform-express": "^10.0.0",
    "kafkajs": "^2.2.4",
    "pg": "^8.12.0",
    "redis": "^4.6.14",
    "reflect-metadata": "^0.2.0",
    "rxjs": "^7.8.1"
  }},
  "devDependencies": {{
    "@nestjs/cli": "^10.0.0",
    "@nestjs/schematics": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/express": "^4.17.17",
    "@types/jest": "^29.5.2",
    "@types/node": "^20.3.1",
    "@types/supertest": "^6.0.0",
    "jest": "^29.5.0",
    "ts-jest": "^29.1.0",
    "ts-node": "^10.9.1",
    "tsconfig-paths": "^4.2.0",
    "typescript": "^5.1.3"
  }}
}}
"""
        create_file(os.path.join(agent_dir, "package.json"), package_content)

        # tsconfig.json
        tsconfig_content = """
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "baseUrl": "./",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false
  }
}
"""
        create_file(os.path.join(agent_dir, "tsconfig.json"), tsconfig_content)

        # Dockerfile
        docker_content = f"""
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main"]
"""
        create_file(os.path.join(agent_dir, "Dockerfile"), docker_content)

        # README.md
        readme_content = f"""
# {agent.replace('-', ' ').title()}
NestJS Agent for coordination and execution of platform-specific workflows.
"""
        create_file(os.path.join(agent_dir, "README.md"), readme_content)

        # .env.example
        env_content = f"""
SERVICE_NAME={agent}
ENVIRONMENT=development
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/{agent.replace('-', '_')}
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
"""
        create_file(os.path.join(agent_dir, ".env.example"), env_content)

        # NestJS Starter files
        create_file(os.path.join(agent_dir, "src", "main.ts"), f"""
import {{ NestFactory }} from '@nestjs/core';
import {{ AppModule }} from './app.module';

async function bootstrap() {{
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT || 3000);
}}
bootstrap();
""")
        create_file(os.path.join(agent_dir, "src", "app.module.ts"), f"""
import {{ Module }} from '@nestjs/common';
import {{ HealthController }} from './health/health.controller';

@Module({{
  imports: [],
  controllers: [HealthController],
  providers: [],
}})
export class AppModule {{}}
""")
        create_file(os.path.join(agent_dir, "src", "health", "health.controller"), "")
        create_file(os.path.join(agent_dir, "src", "health", "health.controller.ts"), f"""
import {{ Controller, Get }} from '@nestjs/common';

@Controller('health')
export class HealthController {{
  @Get()
  check() {{
    return {{ status: 'ok', service: '{agent}' }};
  }}
}}
""")
        
        # Create folder placeholders inside NestJS agent
        dirs = ["config", "controllers", "services", "dto", "entities", "repositories", "events/handlers", "events/contracts", "memory", "knowledge", "kafka", "redis", "postgres", "observability", "health"]
        for d in dirs:
            os.makedirs(os.path.join(agent_dir, "src", d), exist_ok=True)
            create_file(os.path.join(agent_dir, "src", d, ".keep"), "")
            
        create_file(os.path.join(agent_dir, "src", "events", "topics.ts"), "// Topic names")
        create_file(os.path.join(agent_dir, "src", "events", "producer.service.ts"), "// Kafka producer service placeholder")
        create_file(os.path.join(agent_dir, "src", "events", "consumer.service.ts"), "// Kafka consumer service placeholder")
        
        # Test placeholders
        create_file(os.path.join(agent_dir, "test", "app.e2e-spec.ts"), "// Jest E2E tests")

    # 3. Packages
    for pkg in packages:
        pkg_dir = os.path.join(root, "packages", pkg)
        print(f"Scaffolding Package: {pkg}")
        package_content = f"""
{{
  "name": "@packages/{pkg}",
  "version": "0.1.0",
  "private": true,
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {{
    "build": "tsc"
  }},
  "dependencies": {{}},
  "devDependencies": {{
    "typescript": "^5.1.3"
  }}
}}
"""
        create_file(os.path.join(pkg_dir, "package.json"), package_content)
        tsconfig_content = """
{
  "compilerOptions": {
    "module": "commonjs",
    "declaration": true,
    "outDir": "./dist",
    "target": "ES2021",
    "skipLibCheck": true,
    "strict": true
  },
  "include": ["src/**/*"]
}
"""
        create_file(os.path.join(pkg_dir, "tsconfig.json"), tsconfig_content)
        create_file(os.path.join(pkg_dir, "src", "index.ts"), f"// Entry point for package {pkg}\nexport const name = '{pkg}';")

    # 4. Services
    for svc in services:
        svc_dir = os.path.join(root, "services", svc)
        print(f"Scaffolding Service: {svc}")
        package_content = f"""
{{
  "name": "@services/{svc}",
  "version": "0.1.0",
  "private": true,
  "scripts": {{
    "build": "nest build",
    "start": "nest start"
  }},
  "dependencies": {{
    "@nestjs/common": "^10.0.0",
    "@nestjs/core": "^10.0.0"
  }},
  "devDependencies": {{
    "@nestjs/cli": "^10.0.0",
    "typescript": "^5.1.3"
  }}
}}
"""
        create_file(os.path.join(svc_dir, "package.json"), package_content)
        create_file(os.path.join(svc_dir, "tsconfig.json"), tsconfig_content) # Reuse tsconfig
        create_file(os.path.join(svc_dir, "src", "main.ts"), f"// Microservice entry point for {svc}")

    print("Scaffolding complete!")

if __name__ == "__main__":
    main()
