from contextlib import contextmanager
from os import getenv
from pathlib import Path
from threading import RLock
from typing import Iterator

import duckdb

_DUCKDB_LOCK = RLock()


def database_path() -> Path:
    configured_path = getenv("ANALYTICS_DUCKDB_PATH")
    if configured_path:
        target = Path(configured_path).expanduser().resolve()
        target.parent.mkdir(parents=True, exist_ok=True)
        return target

    agent_root = Path(__file__).resolve().parents[2]
    target = agent_root / "data" / "analytics.db"
    target.parent.mkdir(parents=True, exist_ok=True)
    return target


@contextmanager
def connect() -> Iterator[duckdb.DuckDBPyConnection]:
    with _DUCKDB_LOCK:
        connection = duckdb.connect(str(database_path()), read_only=False)
        try:
            yield connection
        finally:
            connection.close()
