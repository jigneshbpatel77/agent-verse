import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();

const pythonAgents = [
  "analytics-agent",
  "research-agent",
  "architecture-agent",
  "engineering-agent",
  "security-agent",
  "quality-agent",
  "content-agent",
  "legal-finance-agent",
];

const nestAgents = [
  "orchestration-agent",
  "product-agent",
  "devops-agent",
  "growth-agent",
  "support-agent",
];

const packageNames = [
  "event-contracts",
  "shared-types",
  "api-client",
  "kafka-client",
  "redis-client",
  "postgres-client",
  "qdrant-client",
  "clickhouse-client",
  "temporal-client",
  "knowledge-sdk",
  "memory-sdk",
  "agent-sdk",
  "approval-sdk",
  "observability-sdk",
  "prompt-library",
  "model-router",
  "config",
];

const platformServices = [
  "knowledge-service",
  "memory-service",
  "approval-service",
  "audit-service",
  "notification-service",
  "file-service",
  "report-service",
  "integration-service",
];

const envExample = (serviceName = "ai-agent-platform", port = 3000) => `SERVICE_NAME=${serviceName}
ENVIRONMENT=local
PORT=${port}
DATABASE_URL=postgresql://platform:platform@localhost:5432/agent_platform
REDIS_URL=redis://localhost:6379
KAFKA_BROKERS=localhost:9092
QDRANT_URL=http://localhost:6333
CLICKHOUSE_URL=http://localhost:8123
TEMPORAL_ADDRESS=localhost:7233
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
JWT_SECRET=change-me-in-production
`;

const write = (file, content) => {
  const target = join(root, file);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, content);
};

const keep = (dir) => write(join(dir, ".gitkeep"), "");

const title = (name) =>
  name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const tsConfig = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "declaration": true,
    "sourceMap": true,
    "outDir": "dist",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
`;

const nestMain = (name, port) => `import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? ${port});
  await app.listen(port);
  Logger.log(\`${name} listening on port \${port}\`, 'Bootstrap');
}

void bootstrap();
`;

const nestAppModule = (name) => `import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';

@Module({
  controllers: [HealthController],
})
export class AppModule {}
`;

const nestHealth = (name) => `import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  readiness() {
    return {
      service: '${name}',
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
`;

const dockerfileNode = (appPath) => `FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY ${appPath}/package.json ${appPath}/package.json
RUN corepack enable && pnpm install --filter ./${appPath} --prod --frozen-lockfile=false

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY ${appPath} ${appPath}
WORKDIR /app/${appPath}
CMD ["pnpm", "start"]
`;

const readmeService = (name, kind) => `# ${title(name)}

${kind} for the Vehicle Information AI Agent Platform.

## Local

\`\`\`bash
pnpm install
pnpm --filter @agent-platform/${name} dev
\`\`\`

## Runtime

Configuration is read from environment variables. See \`.env.example\`.
`;

const pythonSettings = (serviceName) => `from functools import lru_cache
from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    service_name: str = Field(default="${serviceName}", alias="SERVICE_NAME")
    environment: str = Field(default="local", alias="ENVIRONMENT")
    port: int = Field(default=8000, alias="PORT")
    database_url: str = Field(alias="DATABASE_URL")
    redis_url: str = Field(alias="REDIS_URL")
    kafka_brokers: str = Field(alias="KAFKA_BROKERS")
    qdrant_url: str = Field(alias="QDRANT_URL")
    clickhouse_url: str = Field(alias="CLICKHOUSE_URL")
    temporal_address: str = Field(alias="TEMPORAL_ADDRESS")
    openai_api_key: str | None = Field(default=None, alias="OPENAI_API_KEY")
    anthropic_api_key: str | None = Field(default=None, alias="ANTHROPIC_API_KEY")
    otel_exporter_otlp_endpoint: str = Field(alias="OTEL_EXPORTER_OTLP_ENDPOINT")
    jwt_secret: str = Field(alias="JWT_SECRET")

    model_config = {"env_file": ".env", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
`;

const pythonMain = (serviceName) => `from fastapi import FastAPI
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
`;

const pythonRouter = `from fastapi import APIRouter
from app.api.v1.agent_routes import router as agent_router
from app.api.v1.health_routes import router as health_router
from app.api.v1.task_routes import router as task_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(agent_router, prefix="/agent", tags=["agent"])
api_router.include_router(task_router, prefix="/tasks", tags=["tasks"])
`;

const pythonTaskSchema = `from enum import StrEnum
from pydantic import BaseModel, Field


class TaskPriority(StrEnum):
    low = "low"
    normal = "normal"
    high = "high"
    critical = "critical"


class AgentTaskRequest(BaseModel):
    tenant_id: str = Field(min_length=1)
    workflow_id: str | None = None
    task_type: str = Field(min_length=1)
    payload: dict = Field(default_factory=dict)
    priority: TaskPriority = TaskPriority.normal


class AgentTaskResponse(BaseModel):
    task_id: str
    status: str
`;

const pythonEventSchema = `from pydantic import BaseModel, Field


class AgentEvent(BaseModel):
    event_id: str
    topic: str
    tenant_id: str
    aggregate_id: str
    payload: dict = Field(default_factory=dict)
    occurred_at: str
`;

const pythonMemorySchema = `from pydantic import BaseModel, Field


class MemoryRecord(BaseModel):
    agent_id: str
    session_id: str | None = None
    key: str
    value: dict = Field(default_factory=dict)
`;

const pythonCommonSchema = `from pydantic import BaseModel


class ErrorResponse(BaseModel):
    code: str
    message: str
`;

const pythonTaskRoutes = `from fastapi import APIRouter, status
from app.core.runtime import AgentRuntime
from app.schemas.task_schema import AgentTaskRequest, AgentTaskResponse

router = APIRouter()


@router.post("", response_model=AgentTaskResponse, status_code=status.HTTP_202_ACCEPTED)
async def create_task(request: AgentTaskRequest) -> AgentTaskResponse:
    runtime = AgentRuntime()
    return await runtime.accept_task(request)
`;

const pythonHealthRoutes = `from fastapi import APIRouter
from app.config.settings import get_settings

router = APIRouter()


@router.get("/health")
async def health() -> dict[str, str]:
    settings = get_settings()
    return {"service": settings.service_name, "status": "ok"}
`;

const pythonAgentRoutes = `from fastapi import APIRouter
from app.config.settings import get_settings

router = APIRouter()


@router.get("")
async def agent_metadata() -> dict[str, str]:
    settings = get_settings()
    return {"agent": settings.service_name, "capability": "placeholder"}
`;

const pythonRuntime = `from app.core.agent import Agent
from app.schemas.task_schema import AgentTaskRequest, AgentTaskResponse
from app.utils.ids import new_id


class AgentRuntime:
    def __init__(self) -> None:
        self.agent = Agent()

    async def accept_task(self, request: AgentTaskRequest) -> AgentTaskResponse:
        task_id = new_id("task")
        await self.agent.handle(request)
        return AgentTaskResponse(task_id=task_id, status="accepted")
`;

const pythonAgent = `from app.schemas.task_schema import AgentTaskRequest


class Agent:
    async def handle(self, request: AgentTaskRequest) -> None:
        # TODO: route task to domain workflow and emit Kafka lifecycle events.
        _ = request
`;

const pythonPlaceholderClass = (className, comment) => `class ${className}:
    """${comment}"""

    pass
`;

const pythonDockerfile = (agent) => `FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY agents/${agent}/pyproject.toml ./
RUN pip install --no-cache-dir .
COPY agents/${agent}/app ./app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
`;

const pythonPyproject = (agent) => `[project]
name = "${agent}"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "fastapi>=0.115.0",
  "uvicorn[standard]>=0.30.0",
  "pydantic>=2.8.0",
  "pydantic-settings>=2.4.0",
  "sqlalchemy>=2.0.0",
  "alembic>=1.13.0",
  "redis>=5.0.0",
  "qdrant-client>=1.10.0",
  "clickhouse-connect>=0.7.0",
  "aiokafka>=0.10.0",
  "langgraph>=0.2.0",
  "opentelemetry-api>=1.26.0",
  "opentelemetry-sdk>=1.26.0"
]

[build-system]
requires = ["setuptools>=70.0.0"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
include = ["app*"]

[tool.pytest.ini_options]
testpaths = ["tests"]
pythonpath = ["."]
`;

const kafkaTopics = [
  "agent.task.created",
  "agent.task.accepted",
  "agent.task.completed",
  "agent.task.failed",
  "product.prd.approved",
  "architecture.hld.ready",
  "architecture.lld.ready",
  "engineering.task.accepted",
  "engineering.ui.generated",
  "engineering.backend.generated",
  "engineering.api_doc.generated",
  "engineering.frontend.completed",
  "engineering.android.completed",
  "engineering.ios.completed",
  "engineering.pr.created",
  "engineering.knowledge.updated",
  "quality.testing.started",
  "quality.testing.completed",
  "quality.bug.created",
  "devops.deployment.ready",
  "devops.deployment.completed",
  "devops.rollback.requested",
  "analytics.anomaly.detected",
  "analytics.report.generated",
  "analytics.rca.completed",
  "support.ticket.escalated",
  "security.finding.created",
  "approval.requested",
  "approval.completed",
  "incident.started",
  "incident.resolved",
  "knowledge.document.ingested",
  "memory.updated",
];

const pgTables = [
  "agents",
  "agent_tasks",
  "workflows",
  "workflow_steps",
  "approvals",
  "audit_logs",
  "feature_registry",
  "agent_memory",
  "knowledge_documents",
  "knowledge_chunks",
  "code_generation_history",
  "deployment_history",
  "incident_history",
  "model_invocations",
  "kafka_event_log",
];

const clickhouseTables = [
  "business_events",
  "system_metrics",
  "funnel_events",
  "retention_events",
  "agent_performance",
  "cost_metrics",
  "anomaly_events",
];

const qdrantCollections = [
  "product_docs",
  "architecture_docs",
  "engineering_docs",
  "support_kb",
  "legal_docs",
  "design_system",
  "historical_implementations",
  "incident_summaries",
  "analytics_insights",
];

function scaffoldRoot() {
  write("package.json", JSON.stringify({
    name: "ai-agent-platform",
    private: true,
    version: "0.1.0",
    packageManager: "pnpm@9.12.0",
    scripts: {
      dev: "pnpm -r --parallel dev",
      build: "pnpm -r build",
      lint: "pnpm -r lint",
      test: "pnpm -r test",
      "dev:gateway": "pnpm --filter @agent-platform/api-gateway dev",
      "dev:web": "pnpm --filter @agent-platform/web-console dev",
      "dev:orchestrator": "pnpm --filter @agent-platform/orchestrator-service dev"
    },
    devDependencies: {
      "@nx/js": "^20.0.0",
      nx: "^20.0.0",
      turbo: "^2.3.0",
      typescript: "^5.6.0"
    }
  }, null, 2) + "\n");

  write("pnpm-workspace.yaml", `packages:
  - "apps/*"
  - "agents/*"
  - "packages/*"
  - "services/*"
`);

  write("nx.json", JSON.stringify({
    targetDefaults: {
      build: { cache: true },
      lint: { cache: true },
      test: { cache: true }
    }
  }, null, 2) + "\n");

  write("turbo.json", JSON.stringify({
    tasks: {
      build: { dependsOn: ["^build"], outputs: ["dist/**", ".next/**"] },
      lint: {},
      test: {},
      dev: { cache: false, persistent: true }
    }
  }, null, 2) + "\n");

  write("Makefile", `SHELL := /bin/bash

.PHONY: install dev infra-up infra-down analytics-agent

install:
\tpnpm install

dev:
\tpnpm dev

infra-up:
\tdocker compose up -d postgres redis kafka qdrant clickhouse temporal prometheus grafana loki otel-collector

infra-down:
\tdocker compose down

analytics-agent:
\tcd agents/analytics-agent && uvicorn app.main:app --reload --port 8010
`);

  write(".gitignore", `node_modules
.next
dist
coverage
.turbo
.nx
.venv
__pycache__
.pytest_cache
.env
*.pyc
data/postgres/runtime
data/clickhouse/runtime
data/qdrant/runtime
`);

  write(".env.example", envExample());

  write("README.md", `# AI Agent Platform

Scalable monorepo for a Vehicle Information AI Agent Platform in India. The repository starts as a monorepo while keeping each agent independently deployable as a future microservice.

## Architecture

- \`apps/web-console\`: Next.js control console for all agents.
- \`apps/api-gateway\`: NestJS REST and live-update gateway for frontend traffic.
- \`apps/orchestrator-service\`: NestJS control plane for agent registry, routing, approvals, queues, Temporal, Kafka, Redis, and PostgreSQL.
- \`agents/*\`: independently deployable Python FastAPI or NestJS agents.
- \`packages/*\`: shared contracts, clients, SDKs, config, prompts, and model routing.
- \`services/*\`: platform services for knowledge, memory, approvals, audit, notifications, files, reports, and integrations.
- \`infra/*\`: local and future deployment infrastructure.

## Install

\`\`\`bash
corepack enable
pnpm install
\`\`\`

Python agents should use Python 3.12 with a virtual environment per agent or per workspace.

## Run Locally

\`\`\`bash
cp .env.example .env
docker compose up -d
pnpm dev
\`\`\`

## Run Only Analytics Agent

\`\`\`bash
cd agents/analytics-agent
cp .env.example .env
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload --port 8010
\`\`\`

## Add A New Agent

1. Create a folder under \`agents/<agent-name>\`.
2. Choose FastAPI or NestJS based on runtime needs.
3. Add config, events, memory, knowledge, routes, service layer, Dockerfile, README, and env example.
4. Publish Kafka contracts in \`packages/event-contracts\`.
5. Register the agent in \`apps/orchestrator-service/src/agent-registry\`.

## Communication

Agents communicate asynchronously through Kafka events. Lifecycle events such as \`agent.task.created\`, \`agent.task.accepted\`, \`agent.task.completed\`, and \`agent.task.failed\` are defined in \`packages/event-contracts\`.

The API Gateway exposes frontend-safe REST endpoints and live updates through WebSocket/SSE placeholders. It validates auth and RBAC before routing requests to the orchestrator or query services.

## Storage

PostgreSQL is the source of truth for agents, tasks, workflows, approvals, memory metadata, knowledge metadata, deployments, incidents, model calls, and Kafka event logs.

Redis stores session memory, workflow state, locks, rate limits, temporary context, and pub/sub fanout keys. See \`docs/memory/redis-keys.md\`.

Qdrant stores long-term vector knowledge collections such as product docs, architecture docs, support KB, incident summaries, and analytics insights.

ClickHouse stores analytics events, metrics, funnels, retention, cost, anomaly, and agent performance facts.

Temporal runs durable workflows for long-running agent tasks, approvals, retries, compensation, and deployment orchestration.

## Microservice Split

Every agent owns its Dockerfile, config, routes, events, memory, knowledge, repositories, observability, and service layer. To split one out, publish its image independently, point it at shared infrastructure, and replace monorepo-local imports with versioned packages from \`packages/*\`.
`);

  write("docker-compose.yml", `services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: platform
      POSTGRES_PASSWORD: platform
      POSTGRES_DB: agent_platform
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  kafka:
    image: bitnami/kafka:3.8
    environment:
      KAFKA_CFG_NODE_ID: 1
      KAFKA_CFG_PROCESS_ROLES: broker,controller
      KAFKA_CFG_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_CFG_LISTENERS: PLAINTEXT://:9092,CONTROLLER://:9093
      KAFKA_CFG_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_CFG_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE: "true"
    ports:
      - "9092:9092"

  qdrant:
    image: qdrant/qdrant:v1.12.1
    ports:
      - "6333:6333"
    volumes:
      - qdrant-data:/qdrant/storage

  clickhouse:
    image: clickhouse/clickhouse-server:24.10
    ports:
      - "8123:8123"
      - "9000:9000"
    volumes:
      - clickhouse-data:/var/lib/clickhouse

  temporal:
    image: temporalio/auto-setup:1.25
    environment:
      DB: postgresql
      DB_PORT: 5432
      POSTGRES_USER: platform
      POSTGRES_PWD: platform
      POSTGRES_SEEDS: postgres
    depends_on:
      - postgres
    ports:
      - "7233:7233"

  prometheus:
    image: prom/prometheus:v2.55.0
    volumes:
      - ./infra/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana:11.3.0
    ports:
      - "3030:3000"
    volumes:
      - grafana-data:/var/lib/grafana

  loki:
    image: grafana/loki:3.2.1
    ports:
      - "3100:3100"

  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.112.0
    command: ["--config=/etc/otelcol/config.yml"]
    volumes:
      - ./infra/otel/otel-collector.yml:/etc/otelcol/config.yml:ro
    ports:
      - "4317:4317"
      - "4318:4318"

volumes:
  postgres-data:
  qdrant-data:
  clickhouse-data:
  grafana-data:
`);
}

function scaffoldWeb() {
  write("apps/web-console/package.json", JSON.stringify({
    name: "@agent-platform/web-console",
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "next dev",
      build: "next build",
      start: "next start",
      lint: "next lint"
    },
    dependencies: {
      "@tanstack/react-query": "^5.59.0",
      "zustand": "^5.0.0",
      "next": "^15.0.0",
      "react": "^19.0.0",
      "react-dom": "^19.0.0",
      "recharts": "^2.13.0",
      "lucide-react": "^0.468.0"
    },
    devDependencies: {
      "@types/node": "^22.0.0",
      "@types/react": "^19.0.0",
      "@types/react-dom": "^19.0.0",
      "tailwindcss": "^3.4.0",
      "typescript": "^5.6.0"
    }
  }, null, 2) + "\n");
  write("apps/web-console/.env.example", envExample("web-console", 3000));
  write("apps/web-console/next.config.ts", `import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
};

export default nextConfig;
`);
  write("apps/web-console/tsconfig.json", `{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
`);
  write("apps/web-console/tailwind.config.ts", `import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
`);
  write("apps/web-console/postcss.config.js", `module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`);
  write("apps/web-console/components.json", `{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
`);
  write("apps/web-console/README.md", `# Web Console

Next.js frontend for managing agents, workflows, approvals, knowledge, incidents, reports, deployments, and settings.
`);
  write("apps/web-console/src/app/page.tsx", `import { AgentOverview } from '../modules/dashboard/agent-overview';

export default function Page() {
  return <AgentOverview />;
}
`);
  write("apps/web-console/src/app/layout.tsx", `import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Agent Platform',
  description: 'Vehicle information AI agent control console',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`);
  write("apps/web-console/src/app/globals.css", `@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  margin: 0;
  background: #f8fafc;
  color: #0f172a;
}
`);
  write("apps/web-console/src/modules/dashboard/agent-overview.tsx", `const agents = ['analytics', 'research', 'architecture', 'engineering', 'security', 'quality', 'content', 'legal-finance'];

export function AgentOverview() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-semibold">Vehicle Information AI Agent Platform</h1>
      <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {agents.map((agent) => (
          <article key={agent} className="rounded border border-slate-200 bg-white p-4">
            <h2 className="font-medium">{agent}</h2>
            <p className="mt-2 text-sm text-slate-600">Status and task metrics placeholder.</p>
          </article>
        ))}
      </section>
    </main>
  );
}
`);
  for (const dir of ["agents", "analytics", "workflows", "approvals", "knowledge", "incidents", "reports", "deployments", "settings"]) {
    write(`apps/web-console/src/modules/${dir}/README.md`, `# ${title(dir)} Module\n\nPlaceholder module boundary.\n`);
  }
  for (const dir of ["components", "hooks", "lib", "api", "stores", "types", "config"]) keep(`apps/web-console/src/${dir}`);
  write("apps/web-console/src/api/client.ts", `export interface ApiClientOptions {
  baseUrl: string;
  token?: string;
}

export class ApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  async get<T>(path: string): Promise<T> {
    const response = await fetch(new URL(path, this.options.baseUrl), {
      headers: this.options.token ? { Authorization: \`Bearer \${this.options.token}\` } : undefined,
    });
    if (!response.ok) {
      throw new Error(\`API request failed: \${response.status}\`);
    }
    return response.json() as Promise<T>;
  }
}
`);
  write("apps/web-console/src/stores/session-store.ts", `import { create } from 'zustand';

interface SessionState {
  token?: string;
  setToken: (token?: string) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  token: undefined,
  setToken: (token) => set({ token }),
}));
`);
  write("apps/web-console/src/config/runtime.ts", `export const runtimeConfig = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000',
};
`);
}

function scaffoldNestApp(app, port, folders) {
  const base = `apps/${app}`;
  write(`${base}/package.json`, JSON.stringify({
    name: `@agent-platform/${app}`,
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "nest start --watch",
      build: "nest build",
      start: "node dist/main.js",
      lint: "eslint src --ext .ts",
      test: "jest"
    },
    dependencies: {
      "@nestjs/common": "^10.4.0",
      "@nestjs/core": "^10.4.0",
      "@nestjs/platform-express": "^10.4.0",
      "@nestjs/config": "^3.3.0",
      "class-transformer": "^0.5.1",
      "class-validator": "^0.14.1",
      "reflect-metadata": "^0.2.2",
      "rxjs": "^7.8.1"
    },
    devDependencies: {
      "@nestjs/cli": "^10.4.0",
      "@types/node": "^22.0.0",
      "typescript": "^5.6.0"
    }
  }, null, 2) + "\n");
  write(`${base}/tsconfig.json`, tsConfig);
  write(`${base}/nest-cli.json`, JSON.stringify({ collection: "@nestjs/schematics", sourceRoot: "src" }, null, 2) + "\n");
  write(`${base}/src/main.ts`, nestMain(app, port));
  if (app === "api-gateway") {
    write(`${base}/src/app.module.ts`, `import { Module } from '@nestjs/common';
import { AgentsController } from './agents/agents.controller';
import { HealthController } from './health/health.controller';

@Module({
  controllers: [AgentsController, HealthController],
})
export class AppModule {}
`);
    write(`${base}/src/agents/agents.controller.ts`, `import { Controller, Get } from '@nestjs/common';

@Controller('agents')
export class AgentsController {
  @Get()
  listAgents() {
    return {
      agents: [
        'analytics-agent',
        'research-agent',
        'architecture-agent',
        'engineering-agent',
        'security-agent',
        'quality-agent',
        'content-agent',
        'legal-finance-agent',
        'orchestration-agent',
        'product-agent',
        'devops-agent',
        'growth-agent',
        'support-agent',
      ],
    };
  }
}
`);
    write(`${base}/src/auth/jwt-auth.guard.ts`, `import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // TODO: validate JWT and attach principal to request.
    void context;
    return true;
  }
}
`);
    write(`${base}/src/rbac/rbac.guard.ts`, `import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

@Injectable()
export class RbacGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    // TODO: enforce role and permission policies.
    void context;
    return true;
  }
}
`);
    write(`${base}/src/gateway/live-updates.gateway.ts`, `export class LiveUpdatesGateway {
  publish(event: { topic: string; payload: unknown }): void {
    // TODO: bridge Kafka events to WebSocket/SSE clients.
    void event;
  }
}
`);
  } else {
    write(`${base}/src/app.module.ts`, nestAppModule(app));
  }
  write(`${base}/src/health/health.controller.ts`, nestHealth(app));
  write(`${base}/Dockerfile`, dockerfileNode(base));
  write(`${base}/README.md`, readmeService(app, "NestJS application"));
  write(`${base}/.env.example`, envExample(app, port));
  for (const folder of folders) keep(`${base}/src/${folder}`);
}

function scaffoldPythonAgent(agent, port) {
  const base = `agents/${agent}`;
  for (const dir of [
    "app",
    "app/api",
    "app/api/v1",
    "app/config",
    "app/core",
    "app/events",
    "app/events/handlers",
    "app/events/contracts",
    "app/integrations",
    "app/knowledge",
    "app/langgraph",
    "app/langgraph/nodes",
    "app/langgraph/states",
    "app/memory",
    "app/models",
    "app/observability",
    "app/repositories",
    "app/schemas",
    "app/utils",
  ]) {
    write(`${base}/${dir}/__init__.py`, "");
  }
  write(`${base}/app/main.py`, pythonMain(agent));
  write(`${base}/app/config/settings.py`, pythonSettings(agent));
  write(`${base}/app/config/logging.py`, `import logging


def configure_logging() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
`);
  write(`${base}/app/config/constants.py`, `SERVICE_NAME = "${agent}"
`);
  write(`${base}/app/api/router.py`, pythonRouter);
  write(`${base}/app/api/v1/health_routes.py`, pythonHealthRoutes);
  write(`${base}/app/api/v1/task_routes.py`, pythonTaskRoutes);
  write(`${base}/app/api/v1/agent_routes.py`, pythonAgentRoutes);
  write(`${base}/app/core/agent.py`, pythonAgent);
  write(`${base}/app/core/runtime.py`, pythonRuntime);
  write(`${base}/app/core/task_router.py`, pythonPlaceholderClass("TaskRouter", "Routes incoming work to domain workflows."));
  write(`${base}/app/core/workflow_manager.py`, pythonPlaceholderClass("WorkflowManager", "Coordinates Temporal workflows for durable agent execution."));
  write(`${base}/app/core/dependency_container.py`, pythonPlaceholderClass("DependencyContainer", "Builds runtime dependencies for handlers and workflows."));
  write(`${base}/app/domains/README.md`, `# ${title(agent)} Domains\n\nDomain-specific agent capabilities live here.\n`);
  write(`${base}/app/workflows/README.md`, `# Workflows\n\nTemporal and LangGraph workflow placeholders.\n`);
  write(`${base}/app/langgraph/graph_builder.py`, `def build_graph():
    # TODO: compose LangGraph nodes for this agent.
    return None
`);
  for (const dir of ["app/langgraph/nodes", "app/langgraph/states", "app/events/handlers", "app/events/contracts", "tests/unit", "tests/integration", "tests/e2e", "alembic/versions"]) keep(`${base}/${dir}`);
  write(`${base}/app/events/topics.py`, `TASK_ACCEPTED = "agent.task.accepted"
TASK_COMPLETED = "agent.task.completed"
TASK_FAILED = "agent.task.failed"
`);
  write(`${base}/app/events/producer.py`, pythonPlaceholderClass("EventProducer", "Publishes Kafka events."));
  write(`${base}/app/events/consumer.py`, pythonPlaceholderClass("EventConsumer", "Consumes Kafka events."));
  write(`${base}/app/memory/memory_service.py`, pythonPlaceholderClass("MemoryService", "Coordinates Redis working memory and Qdrant long-term memory."));
  write(`${base}/app/memory/short_term_memory.py`, pythonPlaceholderClass("ShortTermMemory", "Redis-backed session memory placeholder."));
  write(`${base}/app/memory/long_term_memory.py`, pythonPlaceholderClass("LongTermMemory", "Qdrant-backed vector memory placeholder."));
  write(`${base}/app/memory/working_context.py`, pythonPlaceholderClass("WorkingContext", "Active task context placeholder."));
  write(`${base}/app/knowledge/rag_service.py`, pythonPlaceholderClass("RagService", "Retrieval augmented generation boundary."));
  write(`${base}/app/knowledge/retriever.py`, pythonPlaceholderClass("Retriever", "Knowledge retrieval placeholder."));
  write(`${base}/app/knowledge/embedder.py`, pythonPlaceholderClass("Embedder", "Embedding model placeholder."));
  write(`${base}/app/knowledge/chunker.py`, pythonPlaceholderClass("Chunker", "Document chunking placeholder."));
  write(`${base}/app/knowledge/indexer.py`, pythonPlaceholderClass("Indexer", "Knowledge indexing placeholder."));
  write(`${base}/app/knowledge/collections.py`, `COLLECTIONS = ["product_docs", "architecture_docs", "engineering_docs", "support_kb"]
`);
  write(`${base}/app/models/llm_client.py`, pythonPlaceholderClass("LlmClient", "LLM provider adapter placeholder."));
  write(`${base}/app/models/model_router.py`, pythonPlaceholderClass("ModelRouter", "Selects model by task, cost, latency, and policy."));
  write(`${base}/app/models/embedding_model.py`, pythonPlaceholderClass("EmbeddingModel", "Embedding provider adapter placeholder."));
  for (const client of ["postgres", "redis", "qdrant", "clickhouse", "kafka"]) {
    write(`${base}/app/integrations/${client}_client.py`, pythonPlaceholderClass(`${client[0].toUpperCase()}${client.slice(1)}Client`, `${client} integration placeholder.`));
  }
  write(`${base}/app/repositories/task_repository.py`, pythonPlaceholderClass("TaskRepository", "PostgreSQL task repository placeholder."));
  write(`${base}/app/repositories/memory_repository.py`, pythonPlaceholderClass("MemoryRepository", "PostgreSQL memory metadata repository placeholder."));
  write(`${base}/app/repositories/audit_repository.py`, pythonPlaceholderClass("AuditRepository", "Audit repository placeholder."));
  write(`${base}/app/schemas/task_schema.py`, pythonTaskSchema);
  write(`${base}/app/schemas/event_schema.py`, pythonEventSchema);
  write(`${base}/app/schemas/memory_schema.py`, pythonMemorySchema);
  write(`${base}/app/schemas/common.py`, pythonCommonSchema);
  write(`${base}/app/observability/tracing.py`, `def configure_tracing() -> None:
    # TODO: configure OpenTelemetry tracing exporter.
    return None
`);
  write(`${base}/app/observability/metrics.py`, `def configure_metrics() -> None:
    # TODO: configure OpenTelemetry metrics exporter.
    return None
`);
  write(`${base}/app/observability/logging.py`, `def configure_structured_logging() -> None:
    # TODO: configure structured logs.
    return None
`);
  write(`${base}/app/observability/middleware.py`, `from fastapi import FastAPI


def install_observability(app: FastAPI) -> None:
    # TODO: install OpenTelemetry ASGI middleware.
    _ = app
`);
  write(`${base}/app/utils/ids.py`, `from uuid import uuid4


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex}"
`);
  write(`${base}/app/utils/datetime.py`, `from datetime import UTC, datetime


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat()
`);
  write(`${base}/app/utils/errors.py`, `class AgentError(Exception):
    pass
`);
  write(`${base}/alembic/env.py`, `from logging.config import fileConfig
from alembic import context

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = None


def run_migrations_offline() -> None:
    context.configure(url="", target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    raise RuntimeError("Configure SQLAlchemy engine before running online migrations.")


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
`);
  write(`${base}/alembic.ini`, `[alembic]
script_location = alembic
sqlalchemy.url = driver://user:pass@localhost/dbname

[loggers]
keys = root

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
`);
  write(`${base}/pyproject.toml`, pythonPyproject(agent));
  write(`${base}/Dockerfile`, pythonDockerfile(agent));
  write(`${base}/README.md`, `# ${title(agent)}

FastAPI AI agent with independent config, API routes, Kafka events, memory, knowledge, repositories, observability, and Docker runtime.

## Local

\`\`\`bash
cp .env.example .env
pip install -e .
uvicorn app.main:app --reload --port ${port}
\`\`\`
`);
  write(`${base}/.env.example`, envExample(agent, port));
}

function scaffoldNestAgent(agent, port) {
  const base = `agents/${agent}`;
  write(`${base}/package.json`, JSON.stringify({
    name: `@agent-platform/${agent}`,
    version: "0.1.0",
    private: true,
    scripts: {
      dev: "nest start --watch",
      build: "nest build",
      start: "node dist/main.js",
      lint: "eslint src --ext .ts",
      test: "jest"
    },
    dependencies: {
      "@nestjs/common": "^10.4.0",
      "@nestjs/core": "^10.4.0",
      "@nestjs/platform-express": "^10.4.0",
      "@nestjs/config": "^3.3.0",
      "reflect-metadata": "^0.2.2",
      "rxjs": "^7.8.1"
    },
    devDependencies: {
      "@nestjs/cli": "^10.4.0",
      "@types/node": "^22.0.0",
      "typescript": "^5.6.0"
    }
  }, null, 2) + "\n");
  write(`${base}/tsconfig.json`, tsConfig);
  write(`${base}/nest-cli.json`, JSON.stringify({ collection: "@nestjs/schematics", sourceRoot: "src" }, null, 2) + "\n");
  write(`${base}/src/main.ts`, nestMain(agent, port));
  write(`${base}/src/app.module.ts`, nestAppModule(agent));
  write(`${base}/src/health/health.controller.ts`, nestHealth(agent));
  write(`${base}/src/events/topics.ts`, `export const TOPICS = {
  taskAccepted: 'agent.task.accepted',
  taskCompleted: 'agent.task.completed',
  taskFailed: 'agent.task.failed',
} as const;
`);
  write(`${base}/src/events/producer.service.ts`, `export class EventProducerService {
  async publish(topic: string, payload: unknown): Promise<void> {
    // TODO: publish through Kafka.
    void topic;
    void payload;
  }
}
`);
  write(`${base}/src/events/consumer.service.ts`, `export class EventConsumerService {
  async start(): Promise<void> {
    // TODO: subscribe to agent topics.
  }
}
`);
  for (const dir of ["config", "controllers", "services", "dto", "entities", "repositories", "events/handlers", "events/contracts", "memory", "knowledge", "kafka", "redis", "postgres", "observability"]) keep(`${base}/src/${dir}`);
  keep(`${base}/test`);
  write(`${base}/Dockerfile`, dockerfileNode(base));
  write(`${base}/README.md`, readmeService(agent, "NestJS agent"));
  write(`${base}/.env.example`, envExample(agent, port));
}

function scaffoldPackages() {
  for (const pkg of packageNames) {
    const base = `packages/${pkg}`;
    write(`${base}/package.json`, JSON.stringify({
      name: `@agent-platform/${pkg}`,
      version: "0.1.0",
      private: true,
      main: "dist/index.js",
      types: "dist/index.d.ts",
      scripts: { build: "tsc -p tsconfig.json", lint: "tsc --noEmit", test: "echo \"No tests yet\"" },
      devDependencies: { typescript: "^5.6.0" }
    }, null, 2) + "\n");
    write(`${base}/tsconfig.json`, tsConfig);
    write(`${base}/nest-cli.json`, JSON.stringify({ collection: "@nestjs/schematics", sourceRoot: "src" }, null, 2) + "\n");
    write(`${base}/src/index.ts`, `export const packageName = '@agent-platform/${pkg}';
`);
    write(`${base}/README.md`, `# ${title(pkg)}\n\nShared package boundary.\n`);
  }
  write("packages/event-contracts/src/topics.ts", `export const KafkaTopics = ${JSON.stringify(kafkaTopics, null, 2)} as const;

export type KafkaTopic = (typeof KafkaTopics)[number];
`);
  write("packages/event-contracts/src/contracts.ts", `import type { KafkaTopic } from './topics';

export interface EventEnvelope<TPayload = Record<string, unknown>> {
  eventId: string;
  topic: KafkaTopic;
  tenantId: string;
  aggregateId: string;
  correlationId?: string;
  causationId?: string;
  payload: TPayload;
  occurredAt: string;
  schemaVersion: number;
}
`);
  write("packages/event-contracts/src/index.ts", `export * from './topics';
export * from './contracts';
`);
  for (const topic of kafkaTopics) {
    write(`packages/event-contracts/contracts/${topic}.json`, JSON.stringify({
      "$schema": "https://json-schema.org/draft/2020-12/schema",
      title: topic,
      type: "object",
      required: ["eventId", "topic", "tenantId", "aggregateId", "payload", "occurredAt", "schemaVersion"],
      properties: {
        eventId: { type: "string" },
        topic: { const: topic },
        tenantId: { type: "string" },
        aggregateId: { type: "string" },
        correlationId: { type: "string" },
        causationId: { type: "string" },
        payload: { type: "object" },
        occurredAt: { type: "string", format: "date-time" },
        schemaVersion: { type: "integer", minimum: 1 }
      },
      additionalProperties: false
    }, null, 2) + "\n");
  }
}

function scaffoldServices() {
  for (const [index, service] of platformServices.entries()) {
    const base = `services/${service}`;
    write(`${base}/package.json`, JSON.stringify({
      name: `@agent-platform/${service}`,
      version: "0.1.0",
      private: true,
      scripts: { dev: "nest start --watch", build: "nest build", start: "node dist/main.js" },
      dependencies: {
        "@nestjs/common": "^10.4.0",
        "@nestjs/core": "^10.4.0",
        "@nestjs/platform-express": "^10.4.0",
        "reflect-metadata": "^0.2.2",
        "rxjs": "^7.8.1"
      },
      devDependencies: { "@nestjs/cli": "^10.4.0", "typescript": "^5.6.0", "@types/node": "^22.0.0" }
    }, null, 2) + "\n");
    write(`${base}/tsconfig.json`, tsConfig);
    write(`${base}/src/main.ts`, nestMain(service, 5000 + index));
    write(`${base}/src/app.module.ts`, nestAppModule(service));
    write(`${base}/src/health/health.controller.ts`, nestHealth(service));
    write(`${base}/Dockerfile`, dockerfileNode(base));
    write(`${base}/README.md`, readmeService(service, "Platform service"));
    write(`${base}/.env.example`, envExample(service, 5000 + index));
  }
}

function scaffoldDataAndInfra() {
  for (const [index, table] of pgTables.entries()) {
    const number = String(index + 1).padStart(3, "0");
    write(`data/postgres/migrations/${number}_create_${table}.sql`, `-- TODO: replace placeholder with production schema for ${table}.
CREATE TABLE IF NOT EXISTS ${table} (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_${table}_tenant_created_at ON ${table} (tenant_id, created_at DESC);
`);
  }
  for (const table of clickhouseTables) {
    write(`data/clickhouse/${table}.sql`, `-- TODO: refine dimensions, partitioning, TTL, and materialized views for ${table}.
CREATE TABLE IF NOT EXISTS ${table} (
  tenant_id String,
  event_id String,
  occurred_at DateTime64(3),
  attributes JSON
) ENGINE = MergeTree
PARTITION BY toYYYYMM(occurred_at)
ORDER BY (tenant_id, occurred_at, event_id);
`);
  }
  write("data/qdrant/collections.yaml", `collections:
${qdrantCollections.map((name) => `  - name: ${name}
    vectors:
      size: 1536
      distance: Cosine
    payload_indexes:
      - tenant_id
      - document_type`).join("\n")}
`);
  for (const dir of ["data/dbt", "data/migrations", "infra/docker", "infra/kubernetes", "infra/helm", "infra/terraform", "infra/kafka", "infra/redis", "infra/postgres", "infra/qdrant", "infra/clickhouse", "infra/temporal", "infra/grafana", "infra/loki"]) keep(dir);
  write("infra/prometheus/prometheus.yml", `global:
  scrape_interval: 15s

scrape_configs:
  - job_name: otel-collector
    static_configs:
      - targets: ["otel-collector:8889"]
`);
  write("infra/otel/otel-collector.yml", `receivers:
  otlp:
    protocols:
      grpc:
      http:

processors:
  batch:

exporters:
  logging:
    verbosity: basic
  prometheus:
    endpoint: "0.0.0.0:8889"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [logging]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [prometheus]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [logging]
`);
}

function scaffoldDocs() {
  const docs = {
    "docs/architecture/README.md": "# Architecture\n\nMonorepo-first architecture with independently deployable agents and shared platform infrastructure.\n",
    "docs/agents/README.md": "# Agents\n\nAgent ownership, runtime, and deployment notes.\n",
    "docs/events/README.md": "# Events\n\nKafka event contracts are versioned in packages/event-contracts.\n",
    "docs/api/README.md": "# API\n\nAPI Gateway exposes frontend-safe REST and live update interfaces.\n",
    "docs/database/README.md": "# Database\n\nPostgreSQL stores source-of-truth records. ClickHouse stores analytics facts.\n",
    "docs/memory/README.md": "# Memory\n\nRedis is working memory. Qdrant is long-term vector knowledge memory.\n",
    "docs/knowledge/README.md": "# Knowledge\n\nKnowledge ingestion writes metadata to PostgreSQL and vectors to Qdrant.\n",
    "docs/deployment/README.md": "# Deployment\n\nEach app and agent has its own Dockerfile for future service extraction.\n",
    "docs/runbooks/README.md": "# Runbooks\n\nOperational runbooks live here.\n",
  };
  for (const [file, content] of Object.entries(docs)) write(file, content);
  write("docs/memory/redis-keys.md", `# Redis Keys

| Key | Purpose |
| --- | --- |
| \`session_memory:{agent_id}:{session_id}\` | Per-agent conversational/session memory. |
| \`active_workflow:{workflow_id}\` | Durable workflow working state cache. |
| \`agent_lock:{agent_id}:{task_id}\` | Distributed lock for task ownership. |
| \`rate_limit:{agent_id}\` | Per-agent rate limiting counter/window. |
| \`temporary_context:{task_id}\` | Short-lived task scratchpad context. |
| \`pubsub:{topic}\` | Redis pub/sub channel namespace. |
`);
  write(".github/workflows/ci.yml", `name: ci

on:
  pull_request:
  push:
    branches: [main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 9.12.0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile=false
      - run: pnpm build
`);
}

function cleanupWrongGeneratedDirs() {
  for (const agent of pythonAgents) {
    for (const dir of ["events", "nodes", "states"]) {
      rmSync(join(root, "agents", agent, dir), { recursive: true, force: true });
    }
  }
  for (const agent of nestAgents) {
    for (const dir of ["config", "controllers", "dto", "entities", "events", "kafka", "knowledge", "memory", "observability", "postgres", "redis", "repositories", "services"]) {
      rmSync(join(root, "agents", agent, dir), { recursive: true, force: true });
    }
  }
}

cleanupWrongGeneratedDirs();
scaffoldRoot();
scaffoldWeb();
scaffoldNestApp("api-gateway", 4000, ["auth", "rbac", "agents", "analytics", "workflows", "approvals", "knowledge", "incidents", "reports", "gateway", "kafka", "redis", "config"]);
scaffoldNestApp("orchestrator-service", 4001, ["agent-registry", "task-router", "workflow-engine", "approval-engine", "priority-queues", "temporal", "kafka", "redis", "postgres", "config"]);
pythonAgents.forEach((agent, index) => scaffoldPythonAgent(agent, 8010 + index));
nestAgents.forEach((agent, index) => scaffoldNestAgent(agent, 8100 + index));

for (const domain of ["system_analytics", "business_analytics", "monitoring_alerting", "root_cause_analysis", "decision_intelligence", "agent_optimization"]) {
  write(`agents/analytics-agent/app/domains/${domain}/README.md`, `# ${domain}\n\nSpecialized analytics domain placeholder.\n`);
}

for (const worker of ["ui_ux_worker", "backend_worker", "api_documentation_worker", "frontend_integration_worker", "android_worker", "ios_worker"]) {
  write(`agents/engineering-agent/app/domains/${worker}/README.md`, `# ${worker}\n\nSpecialized engineering worker placeholder.\n`);
}

scaffoldPackages();
scaffoldServices();
scaffoldDataAndInfra();
scaffoldDocs();
