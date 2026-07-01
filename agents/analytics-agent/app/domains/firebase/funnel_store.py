"""DuckDB-backed persistence for user-defined event funnels.

Stores the funnel definition (name + ordered events). Per-step daily conversion
results are populated separately by the funnel scheduler (runFunnelReport).
"""

import json
import uuid
from typing import Any

from app.integrations.duckdb_client import connect

CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS funnel_definition (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    steps VARCHAR NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""


class FunnelStore:
    def __init__(self) -> None:
        with connect() as conn:
            conn.execute(CREATE_TABLE)

    def list_funnels(self) -> list[dict[str, Any]]:
        with connect() as conn:
            rows = conn.execute(
                "SELECT id, name, steps FROM funnel_definition ORDER BY created_at ASC;"
            ).fetchall()
        return [
            {"id": row[0], "name": row[1], "events": _load_steps(row[2])}
            for row in rows
        ]

    def create(self, name: str, events: list[dict[str, Any]]) -> dict[str, Any]:
        funnel_id = f"funnel-{uuid.uuid4().hex[:12]}"
        with connect() as conn:
            conn.execute(
                "INSERT INTO funnel_definition (id, name, steps, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP);",
                [funnel_id, name, json.dumps(events)],
            )
        return {"id": funnel_id, "name": name, "events": events}

    def delete(self, funnel_id: str) -> None:
        with connect() as conn:
            conn.execute("DELETE FROM funnel_definition WHERE id = ?;", [funnel_id])


def _load_steps(raw: Any) -> list[dict[str, Any]]:
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return []
    return raw or []
