from fastapi import Depends
from aiosqlite import Connection
from src.database import get_db
from src.security import verify_admin


def get_db_connection() -> Connection:
    """Dependency to get database connection."""
    return Depends(get_db)


def require_admin() -> None:
    """Dependency to require admin authentication."""
    return Depends(verify_admin)
