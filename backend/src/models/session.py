from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class SessionResponse(BaseModel):
    """Session response."""
    id: str = Field(..., description="Session ID")
    display_name: str = Field(..., description="Session display name")
    created_at: str = Field(..., description="ISO timestamp of creation")
    updated_at: str = Field(..., description="ISO timestamp of last update")


class RecordSave(BaseModel):
    """Request to save a game record."""
    id: str = Field(..., description="Record ID")
    result: str = Field(..., description="Game result: win, lose, timeout, incomplete")
    durationMs: int = Field(..., description="Duration in milliseconds")
    recordJson: str = Field(..., description="Full record as JSON string")


class RecordResponse(BaseModel):
    """Record response."""
    id: str = Field(..., description="Record ID")
    session_id: str = Field(..., description="Session ID")
    session_display_name: Optional[str] = Field(None, description="Session display name")
    result: str = Field(..., description="Game result")
    duration_ms: int = Field(..., description="Duration in milliseconds")
    record_json: str = Field(..., description="Full record as JSON string")
    created_at: str = Field(..., description="ISO timestamp of creation")
