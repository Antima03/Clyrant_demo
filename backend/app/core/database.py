import os
import threading
from typing import Optional

import duckdb
from dotenv import load_dotenv

load_dotenv()

_thread_local = threading.local()


class _ReusableConnection:
    """Thin proxy that makes close() a no-op so callers don't kill pooled connections."""

    def __init__(self, real: duckdb.DuckDBPyConnection):
        self._real = real

    def __getattr__(self, name: str):
        return getattr(self._real, name)

    def close(self):
        pass  # keep alive for thread reuse


def connect_motherduck(
    database: Optional[str] = None,
    token: Optional[str] = None,
) -> duckdb.DuckDBPyConnection:
    database = database or os.getenv("MOTHERDUCK_DATABASE") or "Clarynt"
    token = token or os.getenv("MOTHERDUCK_TOKEN")

    if not token:
        raise RuntimeError(
            "MotherDuck token is missing. Set MOTHERDUCK_TOKEN in your .env file."
        )

    con = duckdb.connect(f"md:{database}?motherduck_token={token}")
    return con


def get_motherduck_connection() -> duckdb.DuckDBPyConnection:
    return connect_motherduck()


def get_duckdb_connection() -> duckdb.DuckDBPyConnection:
    token = os.getenv("MOTHERDUCK_TOKEN")
    if not token:
        return duckdb.connect()

    con = getattr(_thread_local, "motherduck_con", None)
    if con is None:
        con = connect_motherduck(token=token)
        _thread_local.motherduck_con = con
    return _ReusableConnection(con)