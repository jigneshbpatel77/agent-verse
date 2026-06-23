# AI Agent Platform

Scalable monorepo for a Vehicle Information AI Agent Platform in India. The repository starts as a monorepo while keeping each agent independently deployable as a future microservice.

## Architecture

- `apps/web-console`: Next.js control console for all agents.
- `apps/api-gateway`: NestJS REST and live-update gateway for frontend traffic.
- `apps/orchestrator-service`: NestJS control plane for agent registry, routing, approvals, queues, Temporal, Kafka, Redis, and PostgreSQL.
- `agents/*`: independently deployable Python FastAPI or NestJS agents.
- `packages/*`: shared contracts, clients, SDKs, config, prompts, and model routing.
- `services/*`: platform services for knowledge, memory, approvals, audit, notifications, files, reports, and integrations.
- `infra/*`: local and future deployment infrastructure.

## Install

```bash
corepack enable
pnpm install
```

Python agents should use Python 3.12 with a virtual environment per agent or per workspace.

## Run Locally

```bash
cp .env.example .env
docker compose up -d
pnpm dev
```

## Run Only Analytics Agent

```bash
cd agents/analytics-agent
cp .env.example .env
python -m venv .venv
source .venv/bin/activate
pip install -e .
uvicorn app.main:app --reload --port 8010
```

## Add A New Agent

1. Create a folder under `agents/<agent-name>`.
2. Choose FastAPI or NestJS based on runtime needs.
3. Add config, events, memory, knowledge, routes, service layer, Dockerfile, README, and env example.
4. Publish Kafka contracts in `packages/event-contracts`.
5. Register the agent in `apps/orchestrator-service/src/agent-registry`.

## Communication

Agents communicate asynchronously through Kafka events. Lifecycle events such as `agent.task.created`, `agent.task.accepted`, `agent.task.completed`, and `agent.task.failed` are defined in `packages/event-contracts`.

The API Gateway exposes frontend-safe REST endpoints and live updates through WebSocket/SSE placeholders. It validates auth and RBAC before routing requests to the orchestrator or query services.

## Storage

PostgreSQL is the source of truth for agents, tasks, workflows, approvals, memory metadata, knowledge metadata, deployments, incidents, model calls, and Kafka event logs.

Redis stores session memory, workflow state, locks, rate limits, temporary context, and pub/sub fanout keys. See `docs/memory/redis-keys.md`.

Qdrant stores long-term vector knowledge collections such as product docs, architecture docs, support KB, incident summaries, and analytics insights.

ClickHouse stores analytics events, metrics, funnels, retention, cost, anomaly, and agent performance facts.

Temporal runs durable workflows for long-running agent tasks, approvals, retries, compensation, and deployment orchestration.

## Microservice Split

Every agent owns its Dockerfile, config, routes, events, memory, knowledge, repositories, observability, and service layer. To split one out, publish its image independently, point it at shared infrastructure, and replace monorepo-local imports with versioned packages from `packages/*`.
