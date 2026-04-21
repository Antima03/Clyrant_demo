import os
import sys


def main() -> int:
    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    if backend_root not in sys.path:
        sys.path.insert(0, backend_root)

    try:
        import duckdb  # noqa: F401
    except ModuleNotFoundError:
        pyver = f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}"
        print("ERROR: 'duckdb' is not installed, so the DB connection cannot be tested.")
        print("Fix:")
        print("  1) Use Python 3.12 (recommended on Windows) OR install MSVC Build Tools for compiling.")
        print("  2) Then run: python -m pip install -r backend/requirements.txt")
        print(f"Current Python: {pyver}")
        return 1

    from app.core.database import get_duckdb_connection  # noqa: E402

    con = None
    try:
        con = get_duckdb_connection()
        result = con.execute("SELECT 1").fetchone()
        engine = "motherduck" if os.getenv("MOTHERDUCK_TOKEN") else "duckdb-local"
        print(f"OK: connected ({engine}). Test query result: {result}")
        return 0
    except Exception as exc:
        print(f"ERROR: database connection failed: {exc}")
        return 1
    finally:
        try:
            if con is not None:
                con.close()
        except Exception:
            pass


if __name__ == "__main__":
    raise SystemExit(main())
