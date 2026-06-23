.PHONY: help bootstrap infra-up infra-down run-gateway run-orchestrator run-console run-analytics test-all clean

help:
	@echo "Available commands:"
	@echo "  bootstrap         Install all node dependencies and python envs"
	@echo "  infra-up          Spin up all infrastructure components (Postgres, Kafka, Redis, etc.)"
	@echo "  infra-down        Tear down infrastructure components"
	@echo "  run-gateway       Run the API Gateway service"
	@echo "  run-orchestrator  Run the Orchestration Control Plane service"
	@echo "  run-console       Run the web administration console"
	@echo "  run-analytics     Run the python analytics agent"
	@echo "  test-all          Run automated tests for all components"
	@echo "  clean             Remove logs, cache, build outputs and node_modules"

bootstrap:
	pnpm install
	@echo "Bootstrapping Python Poetry environments..."
	@for agent in agents/*-agent; do \
		if [ -f $$agent/pyproject.toml ]; then \
			echo "Setting up $$agent..."; \
			cd $$agent && poetry install && cd ../..; \
		fi \
	done

infra-up:
	docker compose up -d

infra-down:
	docker compose down

run-gateway:
	pnpm dev:gateway

run-orchestrator:
	pnpm dev:orchestrator

run-console:
	pnpm dev:console

run-analytics:
	cd agents/analytics-agent && poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

test-all:
	pnpm test
	@for agent in agents/*-agent; do \
		if [ -f $$agent/pyproject.toml ]; then \
			echo "Testing $$agent..."; \
			cd $$agent && poetry run pytest && cd ../..; \
		fi \
	done

clean:
	pnpm clean
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
