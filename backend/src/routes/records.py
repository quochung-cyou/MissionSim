from fastapi import APIRouter
from src.database import DbDep
from src.services.session_service import SessionService
from src.models.session import RecordResponse

router = APIRouter(prefix="/api/records", tags=["records"])


@router.get("", response_model=list[RecordResponse])
async def get_records(
    db: DbDep,
    session_name: str | None = None,
    sort_by: str = "date",
    sort_order: str = "desc"
):
    """
    Get all records across sessions with optional filtering and sorting.
    
    - session_name: filter by session display name (substring match)
    - sort_by: date | duration | agents
    - sort_order: asc | desc
    """
    session_service = SessionService(db)
    records = await session_service.get_all_records(
        session_name=session_name,
        sort_by=sort_by,
        sort_order=sort_order
    )
    return [RecordResponse(**r) for r in records]
