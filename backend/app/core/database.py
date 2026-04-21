import os
from typing import Optional

import duckdb
from dotenv import load_dotenv

load_dotenv()

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
    if token:
        return connect_motherduck(token=token)
    return duckdb.connect()