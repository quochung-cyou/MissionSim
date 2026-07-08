from aiosqlite import Connection
from src.repositories.session_repository import SessionRepository
from src.repositories.record_repository import RecordRepository
from src.exceptions import SessionNotFoundError
from typing import List, Optional


class SessionService:
    """Service for managing sessions and game records."""
    
    def __init__(self, db: Connection):
        self.db = db
        self.session_repo = SessionRepository(db)
        self.record_repo = RecordRepository(db)
    
    async def get_sessions(self) -> List[dict]:
        """Get all sessions ordered by updated_at DESC."""
        return await self.session_repo.get_all()
    
    async def get_session(self, session_id: str) -> dict:
        """Get a specific session."""
        session = await self.session_repo.get(session_id)
        if not session:
            raise SessionNotFoundError(f"Session {session_id} not found")
        return session
    
    async def save_record(
        self,
        session_id: str,
        record_id: str,
        result: str,
        duration_ms: int,
        record_json: str
    ) -> None:
        """Save a game record to a session (creates session if needed)."""
        # Ensure session exists
        await self.session_repo.get_or_create(session_id, session_id)
        
        # Save the record
        await self.record_repo.save(
            record_id=record_id,
            session_id=session_id,
            result=result,
            duration_ms=duration_ms,
            record_json=record_json
        )
    
    async def get_records(self, session_id: str) -> List[dict]:
        """Get all records for a session."""
        # Verify session exists
        session = await self.session_repo.get(session_id)
        if not session:
            raise SessionNotFoundError(f"Session {session_id} not found")
        
        return await self.record_repo.get_by_session(session_id)
    
    async def get_all_records(
        self,
        session_name: Optional[str] = None,
        sort_by: str = "date",
        sort_order: str = "desc"
    ) -> List[dict]:
        """Get all records across sessions with optional filtering and sorting."""
        return await self.record_repo.get_all(
            session_name=session_name,
            sort_by=sort_by,
            sort_order=sort_order
        )
    
    async def delete_session(self, session_id: str) -> None:
        """Delete a session and all its records."""
        await self.session_repo.delete(session_id)
