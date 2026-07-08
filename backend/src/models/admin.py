from pydantic import BaseModel, Field
from typing import List, Optional


class ConfigUpdateRequest(BaseModel):
    """Request to update config."""
    qwenApiKey: Optional[str] = Field(None, description="Qwen API key")


class ConfigResponse(BaseModel):
    """Response with config status."""
    qwenApiKeySet: bool = Field(..., description="Whether API key is configured")


class ModelAddRequest(BaseModel):
    """Request to add a model to registry."""
    name: str = Field(..., description="Model name (e.g., qwen-plus)")


class ModelUpdateRequest(BaseModel):
    """Request to update the entire model registry."""
    models: List[str] = Field(..., description="Ordered list of model names")


class ModelsResponse(BaseModel):
    """Response with model registry."""
    models: List[str] = Field(..., description="Ordered list of available models")
