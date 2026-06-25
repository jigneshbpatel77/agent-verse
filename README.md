# Analytics Agent Platform

Focused dashboard and API gateway for the VehicleInfo Analytics Agent.

## Architecture

- `apps/web-console`: Next.js Analytics Agent console.
- `apps/api-gateway`: NestJS gateway for frontend traffic and analytics-agent proxy routes.
- `agents/analytics-agent`: Python FastAPI analytics service.
- `packages/*`: shared contracts, clients, SDKs, config, prompts, and model routing.
- `infra/*`: local and future deployment infrastructure.

## Install

```bash
corepack enable
pnpm install
```

The Analytics Agent uses Python 3.12 with a local virtual environment.

## Run Locally

Terminal 1:

```bash
cp .env.example .env
docker compose up -d
pnpm dev:analytics
```

Terminal 2:

```bash
pnpm dev
```

Open the web console at `http://localhost:3000`.

If Docker fails to pull Kafka with `bitnami/kafka:3.8: not found`, use the legacy Bitnami image:

```bash
perl -0pi -e 's#bitnami/kafka:3\.8#bitnamilegacy/kafka:3.8#g' docker-compose.yml
docker compose pull
docker compose up -d
```

If the web console shows `Cannot find module 'autoprefixer'`, install the missing PostCSS plugin and restart the dev server:

```bash
pnpm --filter @agent-platform/web-console add -D autoprefixer
pnpm dev:web
```

`pnpm dev` starts only:

- `apps/web-console`
- `apps/api-gateway`

It no longer starts every monorepo package.

## Run Web Console

```bash
cp .env.example .env
cp apps/web-console/.env.example apps/web-console/.env
docker compose up -d
pnpm dev:web
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
