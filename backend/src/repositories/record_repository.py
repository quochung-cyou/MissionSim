from .base import BaseRepository
from typing import List, Optional
from datetime import datetime


SORTABLE_COLUMNS = {
    "date": "r.created_at",
    "duration": "r.duration_ms",
    "agents": "agent_count",
}


class RecordRepository(BaseRepository):
    """Repository for game records."""
    
    async def save(
        self,
        record_id: str,
        session_id: str,
        result: str,
        duration_ms: int,
        record_json: str
    ) -> None:
        """Save a game record."""
        await self.execute(
            """
            INSERT INTO records (id, session_id, result, duration_ms, record_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (record_id, session_id, result, duration_ms, record_json, datetime.utcnow().isoformat())
        )
    
    async def get_by_session(self, session_id: str) -> List[dict]:
        """Get all records for a session, ordered by created_at DESC."""
        return await self.fetchall(
            "SELECT * FROM records WHERE session_id = ? ORDER BY created_at DESC",
            (session_id,)
        )
    
    async def get_all(
        self,
        session_name: Optional[str] = None,
        sort_by: str = "date",
        sort_order: str = "desc"
    ) -> List[dict]:
        """Get all records across sessions with optional filtering and sorting."""
        sort_column = SORTABLE_COLUMNS.get(sort_by, "r.created_at")
        order = "DESC" if sort_order.lower() == "desc" else "ASC"
        
        params = []
        where_clause = ""
        
        if session_name:
            where_clause = "WHERE s.display_name LIKE ?"
            params.append(f"%{session_name}%")
        
        query = f"""
            SELECT 
                r.id,
                r.session_id,
                s.display_name as session_display_name,
                r.result,
                r.duration_ms,
                r.record_json,
                r.created_at,
                CAST(json_extract(r.record_json, '$.agentCount') AS INTEGER) as agent_count
            FROM records r
            JOIN sessions s ON r.session_id = s.id
            {where_clause}
            ORDER BY {sort_column} {order}
        """
        
        return await self.fetchall(query, tuple(params))
    
    async def get(self, record_id: str) -> Optional[dict]:
        """Get a specific record by ID."""
        return await self.fetchone(
            "SELECT * FROM records WHERE id = ?",
            (record_id,)
        )
    
    async def delete(self, record_id: str) -> None:
        """Delete a record."""
        await self.execute(
            "DELETE FROM records WHERE id = ?",
            (record_id,)
        )
