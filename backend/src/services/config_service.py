from aiosqlite import Connection
from src.repositories.config_repository import ConfigRepository
from src.exceptions import ConfigError


class ConfigService:
    """Service for managing application configuration."""
    
    def __init__(self, db: Connection):
        self.db = db
        self.config_repo = ConfigRepository(db)
    
    async def update_qwen_api_key(self, api_key: str) -> None:
        """Update the Qwen API key."""
        if not api_key or not api_key.strip():
            raise ConfigError("API key cannot be empty")
        await self.config_repo.set("qwen_api_key", api_key.strip())
    
    async def get_qwen_api_key_status(self) -> bool:
        """Check if Qwen API key is configured."""
        return await self.config_repo.exists("qwen_api_key")
    
    async def get_config(self, key: str) -> str | None:
        """Get a config value by key."""
        return await self.config_repo.get(key)
    
    async def set_config(self, key: str, value: str) -> None:
        """Set a config value."""
        await self.config_repo.set(key, value)
