from .base import BaseRepository
from typing import List, Optional
from datetime import datetime


class SessionRepository(BaseRepository):
    """Repository for session management."""
    
    async def get(self, session_id: str) -> Optional[dict]:
        """Get a session by ID."""
        return await self.fetchone(
            "SELECT * FROM sessions WHERE id = ?",
            (session_id,)
        )
    
    async def get_all(self) -> List[dict]:
        """Get all sessions ordered by updated_at DESC."""
        return await self.fetchall(
            "SELECT * FROM sessions ORDER BY updated_at DESC"
        )
    
    async def create(self, session_id: str, display_name: str) -> None:
        """Create a new session."""
        now = datetime.utcnow().isoformat()
        await self.execute(
            "INSERT INTO sessions (id, display_name, created_at, updated_at) VALUES (?, ?, ?, ?)",
            (session_id, display_name, now, now)
        )
    
    async def update_timestamp(self, session_id: str) -> None:
        """Update the session's updated_at timestamp."""
        await self.execute(
            "UPDATE sessions SET updated_at = ? WHERE id = ?",
            (datetime.utcnow().isoformat(), session_id)
        )
    
    async def get_or_create(self, session_id: str, display_name: str) -> None:
        """Get a session if it exists, create it otherwise."""
        existing = await self.get(session_id)
        if not existing:
            await self.create(session_id, display_name)
        else:
            await self.update_timestamp(session_id)
    
    async def delete(self, session_id: str) -> None:
        """Delete a session and its records."""
        # Records will be cascade deleted if we had FK constraints
        # For now, delete records first
        await self.execute("DELETE FROM records WHERE session_id = ?", (session_id,))
        await self.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
