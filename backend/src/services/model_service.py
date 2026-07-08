from aiosqlite import Connection
from src.repositories.model_repository import ModelRepository
from src.exceptions import ConfigError
from typing import List


class ModelService:
    """Service for managing the model registry."""
    
    def __init__(self, db: Connection):
        self.db = db
        self.model_repo = ModelRepository(db)
    
    async def get_models(self) -> List[str]:
        """Get all models in priority order."""
        return await self.model_repo.get_all_ordered()
    
    async def add_model(self, name: str) -> None:
        """Add a model to the end of the registry."""
        if not name or not name.strip():
            raise ConfigError("Model name cannot be empty")
        
        # Check if already exists
        existing = await self.model_repo.get_all_ordered()
        if name in existing:
            raise ConfigError(f"Model {name} already exists in registry")
        
        await self.model_repo.add(name.strip())
    
    async def delete_model(self, name: str) -> None:
        """Delete a model from the registry."""
        await self.model_repo.delete(name)
    
    async def replace_models(self, models: List[str]) -> None:
        """Replace the entire model registry."""
        if not models:
            raise ConfigError("Model list cannot be empty")
        
        # Validate no duplicates
        if len(models) != len(set(models)):
            raise ConfigError("Model list contains duplicates")
        
        # Validate no empty names
        for name in models:
            if not name or not name.strip():
                raise ConfigError("Model name cannot be empty")
        
        await self.model_repo.replace_all([m.strip() for m in models])
    
    async def get_active_model(self) -> str | None:
        """Get the current active model (first in registry)."""
        return await self.model_repo.get_first()
    
    async def get_model_count(self) -> int:
        """Get the total number of models."""
        return await self.model_repo.count()
