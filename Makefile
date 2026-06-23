SHELL := /bin/bash

.PHONY: install dev infra-up infra-down analytics-agent

install:
	pnpm install

dev:
	pnpm dev

infra-up:
	docker compose up -d postgres redis kafka qdrant clickhouse temporal prometheus grafana loki otel-collector

infra-down:
	docker compose down

analytics-agent:
	cd agents/analytics-agent && uvicorn app.main:app --reload --port 8010
