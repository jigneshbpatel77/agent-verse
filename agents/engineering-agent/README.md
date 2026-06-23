# Engineering Agent

FastAPI AI agent with independent config, API routes, Kafka events, memory, knowledge, repositories, observability, and Docker runtime.

## Local

```bash
cp .env.example .env
pip install -e .
uvicorn app.main:app --reload --port 8013
```
