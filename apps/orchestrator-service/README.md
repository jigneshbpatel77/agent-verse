# @apps/orchestrator-service

NestJS Orchestration Service running Temporal workflow states, task routers, and Kafka events handlers to dispatch steps dynamically.

## Key Features
- Temporal runner workflow state coordination
- Distributed priority queuing for agent tasks
- Audit trail event logging to PostgreSQL
- Kafka subscription & task matching

## Run Local
```bash
pnpm start:dev
```
