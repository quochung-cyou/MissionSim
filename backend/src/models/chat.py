from pydantic import BaseModel, Field
from typing import List, Optional


class ChatMessage(BaseModel):
    """Chat message for Qwen API."""
    role: str = Field(..., description="Message role: system, user, or assistant")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Request to chat endpoint."""
    messages: List[ChatMessage] = Field(..., description="List of chat messages")
    temperature: Optional[float] = Field(0.7, ge=0.0, le=2.0, description="Sampling temperature")
    max_tokens: Optional[int] = Field(2048, ge=1, description="Maximum tokens to generate")
    enable_thinking: Optional[bool] = Field(False, description="Enable thinking mode")


class ChatResponse(BaseModel):
    """Response from chat endpoint."""
    content: str = Field(..., description="Generated response content")
    model: Optional[str] = Field(None, description="Model used for generation")
