from .base import BaseRepository
from typing import Optional


class ConfigRepository(BaseRepository):
    """Repository for config key-value storage."""
    
    async def get(self, key: str) -> Optional[str]:
        """Get a config value by key."""
        result = await self.fetchone(
            "SELECT value FROM config WHERE key = ?",
            (key,)
        )
        return result["value"] if result else None
    
    async def set(self, key: str, value: str) -> None:
        """Set a config value (upsert)."""
        await self.execute(
            """
            INSERT INTO config (key, value) VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
            """,
            (key, value)
        )
    
    async def delete(self, key: str) -> None:
        """Delete a config value."""
        await self.execute(
            "DELETE FROM config WHERE key = ?",
            (key,)
        )
    
    async def exists(self, key: str) -> bool:
        """Check if a config key exists."""
        result = await self.fetchone(
            "SELECT 1 FROM config WHERE key = ?",
            (key,)
        )
        return result is not None
