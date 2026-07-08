from fastapi import APIRouter, Depends
from aiosqlite import Connection
from src.database import DbDep
from src.security import verify_admin
from src.services.config_service import ConfigService
from src.services.model_service import ModelService
from src.models.admin import ConfigUpdateRequest, ConfigResponse, ModelAddRequest, ModelUpdateRequest, ModelsResponse

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/config")
async def update_config(
    request: ConfigUpdateRequest,
    db: DbDep,
    _: None = Depends(verify_admin)
) -> dict:
    """Update configuration (e.g., Qwen API key)."""
    config_service = ConfigService(db)
    
    if request.qwenApiKey is not None:
        await config_service.update_qwen_api_key(request.qwenApiKey)
    
    return {"status": "ok"}


@router.get("/config", response_model=ConfigResponse)
async def get_config(
    db: DbDep,
    _: None = Depends(verify_admin)
):
    """Get configuration status."""
    config_service = ConfigService(db)
    qwen_key_set = await config_service.get_qwen_api_key_status()
    return ConfigResponse(qwenApiKeySet=qwen_key_set)


@router.get("/models", response_model=ModelsResponse)
async def get_models(
    db: DbDep,
    _: None = Depends(verify_admin)
):
    """Get the current model registry in priority order."""
    model_service = ModelService(db)
    models = await model_service.get_models()
    return ModelsResponse(models=models)


@router.post("/models")
async def add_model(
    request: ModelAddRequest,
    db: DbDep,
    _: None = Depends(verify_admin)
):
    """Add a model to the end of the registry."""
    model_service = ModelService(db)
    await model_service.add_model(request.name)
    return {"status": "ok"}


@router.put("/models")
async def update_models(
    request: ModelUpdateRequest,
    db: DbDep,
    _: None = Depends(verify_admin)
):
    """Replace the entire model registry."""
    model_service = ModelService(db)
    await model_service.replace_models(request.models)
    return {"status": "ok"}


@router.delete("/models/{model_name}")
async def delete_model(
    model_name: str,
    db: DbDep,
    _: None = Depends(verify_admin)
):
    """Delete a model from the registry."""
    model_service = ModelService(db)
    await model_service.delete_model(model_name)
    return {"status": "ok"}
