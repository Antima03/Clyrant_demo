import os
from typing import Optional

import duckdb


def connect_motherduck(
    database: Optional[str] = None,
    token: Optional[str] = None,
) -> duckdb.DuckDBPyConnection:
    database = database or os.getenv("MOTHERDUCK_DATABASE") or "my_db"
    token = token or os.getenv("MOTHERDUCK_TOKEN")

    if not token:
        raise RuntimeError(
            "MotherDuck token is missing. Set MOTHERDUCK_TOKEN in your environment."
        )

    con = duckdb.connect(f"md:{database}")
    con.execute("SET motherduck_token = ?", [token])
    return con


def get_motherduck_connection() -> duckdb.DuckDBPyConnection:
    return connect_motherduck()