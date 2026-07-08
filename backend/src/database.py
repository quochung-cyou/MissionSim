import aiosqlite
from pathlib import Path
from typing import AsyncGenerator, Annotated
from fastapi import Depends
from src.config import settings


# Ensure data directory exists
data_dir = Path("data")
data_dir.mkdir(exist_ok=True)

database_path = data_dir / "app.db"


async def get_db() -> AsyncGenerator[aiosqlite.Connection, None]:
    """Get a database connection for use in FastAPI dependencies."""
    async with aiosqlite.connect(database_path) as db:
        yield db


DbDep = Annotated[aiosqlite.Connection, Depends(get_db)]


async def init_db() -> None:
    """Initialize database schema."""
    async with aiosqlite.connect(database_path) as db:
        # Config table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)
        
        # Models table (ordered by priority)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS models (
                name TEXT PRIMARY KEY,
                sort_order INTEGER NOT NULL,
                added_at TEXT NOT NULL
            )
        """)
        
        # Sessions table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                display_name TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        """)
        
        # Records table
        await db.execute("""
            CREATE TABLE IF NOT EXISTS records (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                result TEXT NOT NULL,
                duration_ms INTEGER NOT NULL,
                record_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (session_id) REFERENCES sessions(id)
            )
        """)
        
        # Index for records
        await db.execute("""
            CREATE INDEX IF NOT EXISTS idx_records_session 
            ON records(session_id, created_at DESC)
        """)
        
        await db.commit()
