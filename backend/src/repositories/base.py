from abc import ABC, abstractmethod
from aiosqlite import Connection
from typing import Optional, List, Dict, Any


class BaseRepository(ABC):
    """Base repository with common database operations."""
    
    def __init__(self, db: Connection):
        self.db = db
    
    async def execute(self, sql: str, params: tuple = ()) -> None:
        """Execute a SQL statement."""
        await self.db.execute(sql, params)
        await self.db.commit()
    
    async def fetchone(self, sql: str, params: tuple = ()) -> Optional[Dict[str, Any]]:
        """Fetch a single row as a dictionary."""
        async with self.db.execute(sql, params) as cursor:
            row = await cursor.fetchone()
            if row:
                columns = [description[0] for description in cursor.description]
                return dict(zip(columns, row))
            return None
    
    async def fetchall(self, sql: str, params: tuple = ()) -> List[Dict[str, Any]]:
        """Fetch all rows as a list of dictionaries."""
        async with self.db.execute(sql, params) as cursor:
            rows = await cursor.fetchall()
            if rows:
                columns = [description[0] for description in cursor.description]
                return [dict(zip(columns, row)) for row in rows]
            return []
