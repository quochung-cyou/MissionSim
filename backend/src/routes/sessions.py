from fastapi import APIRouter, Depends
from aiosqlite import Connection
from src.database import DbDep
from src.services.session_service import SessionService
from src.models.session import SessionResponse, RecordSave, RecordResponse

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("", response_model=list[SessionResponse])
async def get_sessions(db: DbDep):
    """Get all sessions ordered by updated_at DESC."""
    session_service = SessionService(db)
    sessions = await session_service.get_sessions()
    return [SessionResponse(**s) for s in sessions]


@router.post("/{session_id}/records")
async def save_record(
    session_id: str,
    record: RecordSave,
    db: DbDep
):
    """Save a game record to a session (creates session if needed)."""
    session_service = SessionService(db)
    await session_service.save_record(
        session_id=session_id,
        record_id=record.id,
        result=record.result,
        duration_ms=record.durationMs,
        record_json=record.recordJson
    )
    return {"status": "ok"}


@router.get("/{session_id}/records", response_model=list[RecordResponse])
async def get_records(session_id: str, db: DbDep):
    """Get all records for a session, ordered by created_at DESC."""
    session_service = SessionService(db)
    records = await session_service.get_records(session_id)
    return [RecordResponse(**r) for r in records]
