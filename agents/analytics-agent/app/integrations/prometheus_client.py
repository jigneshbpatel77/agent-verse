from datetime import datetime
import logging
from typing import Any

import httpx


logger = logging.getLogger(__name__)


class PrometheusClientError(RuntimeError):
    pass


class PrometheusClient:
    def __init__(self, base_url: str, timeout_seconds: float = 10) -> None:
        self.base_url = base_url.rstrip("/")
        self.timeout_seconds = timeout_seconds

    async def query(self, promql: str) -> dict[str, Any]:
        logger.info("Prometheus instant query: %s", promql)
        return await self._get("/api/v1/query", {"query": promql})

    async def query_range(self, promql: str, start: datetime, end: datetime, step: str) -> dict[str, Any]:
        logger.info("Prometheus range query: %s", promql)
        return await self._get(
            "/api/v1/query_range",
            {
                "query": promql,
                "start": start.isoformat(),
                "end": end.isoformat(),
                "step": step,
            },
        )

    async def label_values(self, label_name: str) -> list[str]:
        logger.info("Prometheus label values query: %s", label_name)
        response = await self._get(f"/api/v1/label/{label_name}/values", {})
        data = response.get("data")
        if not isinstance(data, list):
            return []
        return [value for value in data if isinstance(value, str)]

    async def _get(self, path: str, params: dict[str, str]) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout_seconds) as client:
                response = await client.get(f"{self.base_url}{path}", params=params)
                response.raise_for_status()
                payload = response.json()
        except httpx.TimeoutException as exc:
            raise PrometheusClientError("Prometheus query timed out") from exc
        except httpx.ConnectError as exc:
            raise PrometheusClientError("Prometheus connection failed") from exc
        except httpx.HTTPError as exc:
            raise PrometheusClientError(f"Prometheus request failed: {exc}") from exc
        except ValueError as exc:
            raise PrometheusClientError("Prometheus returned invalid JSON") from exc

        if payload.get("status") != "success":
            error = payload.get("error") or "unknown Prometheus error"
            raise PrometheusClientError(str(error))

        return payload
