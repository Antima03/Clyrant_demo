from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

from app.api.v1.routers import router as v1_router

_state_enum: list = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _state_enum
    try:
        from app.core.database import get_duckdb_connection
        con = get_duckdb_connection()
        _state_enum = [
            r[0]
            for r in con.execute(
                "SELECT DISTINCT ST_NAME FROM main.geomaster "
                "WHERE ST_NAME IS NOT NULL ORDER BY ST_NAME"
            ).fetchall()
        ]
        con.close()
    except Exception:
        pass
    yield


app = FastAPI(
    title="Backend Gateway",
    description="Gateway app that mounts multiple backends",
    version="1.0.0",
    lifespan=lifespan,
)

app.include_router(v1_router, prefix="/api/v1")


@app.get("/")
async def root():
    return {"message": "Hello World"}


def custom_openapi():
    schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    if _state_enum:
        for path_item in schema.get("paths", {}).values():
            for param in path_item.get("get", {}).get("parameters", []):
                if param.get("name") == "state":
                    param["schema"] = {"type": "string", "enum": _state_enum}
    return schema


app.openapi = custom_openapi

