"""DuckDB-backed run history for scheduled jobs.

Every scheduled pipeline records a row here when it starts and again when it
finishes (success or failure). The scheduler-monitor endpoints read this table
to build summary cards, job status, and per-job execution logs.
"""

from datetime import UTC, datetime
from typing import Any

from app.integrations.duckdb_client import connect

CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS scheduler_runs (
    id VARCHAR PRIMARY KEY,
    job_key VARCHAR NOT NULL,
    status VARCHAR NOT NULL,
    started_at TIMESTAMP NOT NULL,
    finished_at TIMESTAMP,
    duration_ms BIGINT,
    rows_processed BIGINT,
    error VARCHAR,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""


def _ensure_table(conn: Any) -> None:
    conn.execute(CREATE_TABLE)


def start_run(job_key: str) -> str:
    """Record the start of a run; returns the run id used to finish it."""
    run_id = f"{job_key}-{datetime.now(UTC).strftime('%Y%m%d%H%M%S%f')}"
    with connect() as conn:
        _ensure_table(conn)
        conn.execute(
            "INSERT INTO scheduler_runs (id, job_key, status, started_at) VALUES (?, ?, 'Running', ?);",
            [run_id, job_key, datetime.now(UTC)],
        )
    return run_id


def finish_run(
    run_id: str,
    status: str,
    rows_processed: int | None = None,
    error: str | None = None,
) -> None:
    with connect() as conn:
        _ensure_table(conn)
        row = conn.execute("SELECT started_at FROM scheduler_runs WHERE id = ?;", [run_id]).fetchone()
        started_at = row[0] if row else None
        finished_at = datetime.now(UTC)
        duration_ms = None
        if started_at is not None:
            duration_ms = int((finished_at - started_at).total_seconds() * 1000)
        conn.execute(
            """
            UPDATE scheduler_runs
            SET status = ?, finished_at = ?, duration_ms = ?, rows_processed = ?, error = ?
            WHERE id = ?;
            """,
            [status, finished_at, duration_ms, rows_processed, (error or None), run_id],
        )


def latest_run(job_key: str) -> dict[str, Any] | None:
    with connect() as conn:
        _ensure_table(conn)
        row = conn.execute(
            """
            SELECT status, started_at, finished_at, duration_ms, rows_processed, error
            FROM scheduler_runs WHERE job_key = ?
            ORDER BY started_at DESC LIMIT 1;
            """,
            [job_key],
        ).fetchone()
    return _row_to_run(row) if row else None


def recent_runs(job_key: str, limit: int = 20) -> list[dict[str, Any]]:
    with connect() as conn:
        _ensure_table(conn)
        rows = conn.execute(
            """
            SELECT status, started_at, finished_at, duration_ms, rows_processed, error
            FROM scheduler_runs WHERE job_key = ?
            ORDER BY started_at DESC LIMIT ?;
            """,
            [job_key, limit],
        ).fetchall()
    return [_row_to_run(row) for row in rows]


def counts() -> dict[str, int]:
    """Aggregate counts used by the summary cards."""
    with connect() as conn:
        _ensure_table(conn)
        running = conn.execute("SELECT COUNT(*) FROM scheduler_runs WHERE status = 'Running';").fetchone()[0]
        failed_24h = conn.execute(
            """
            SELECT COUNT(*) FROM scheduler_runs
            WHERE status = 'Failed' AND started_at >= now() - INTERVAL 24 HOUR;
            """
        ).fetchone()[0]
        total_finished = conn.execute(
            "SELECT COUNT(*) FROM scheduler_runs WHERE status IN ('Success', 'Failed');"
        ).fetchone()[0]
        total_success = conn.execute(
            "SELECT COUNT(*) FROM scheduler_runs WHERE status = 'Success';"
        ).fetchone()[0]
    return {
        "running": int(running or 0),
        "failed_24h": int(failed_24h or 0),
        "total_finished": int(total_finished or 0),
        "total_success": int(total_success or 0),
    }


def _row_to_run(row: Any) -> dict[str, Any]:
    return {
        "status": row[0],
        "started_at": row[1],
        "finished_at": row[2],
        "duration_ms": row[3],
        "rows_processed": row[4],
        "error": row[5],
    }
