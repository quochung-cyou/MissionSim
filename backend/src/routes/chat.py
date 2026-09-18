from fastapi import APIRouter, Depends
from aiosqlite import Connection
from src.database import DbDep
from src.services.qwen_service import QwenService
from src.models.chat import ChatRequest, ChatResponse

router = APIRouter(prefix="/api/v1", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: DbDep
):
    """
    Proxy chat request to Qwen Cloud API with automatic model rotation.
    
    This endpoint forwards the request to Qwen Cloud using the stored API key
    and the current active model. If the model returns 403, 404, or 429, it is automatically
    dropped from the registry and the next model is tried.
    """
    qwen_service = QwenService(db)
    
    # Convert Pydantic messages to dicts
    messages = [msg.model_dump() for msg in request.messages]
    
    # Call Qwen with model rotation
    content, model_used = await qwen_service.chat(
        messages=messages,
        temperature=request.temperature,
        max_tokens=request.max_tokens,
        enable_thinking=request.enable_thinking
    )
    
    return ChatResponse(content=content, model=model_used)
