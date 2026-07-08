from .base import BaseRepository
from typing import List, Optional
from datetime import datetime


class ModelRepository(BaseRepository):
    """Repository for model registry with ordered priority."""
    
    async def get_all_ordered(self) -> List[str]:
        """Get all model names ordered by sort_order (priority)."""
        rows = await self.fetchall(
            "SELECT name FROM models ORDER BY sort_order ASC"
        )
        return [row["name"] for row in rows]
    
    async def get_first(self) -> Optional[str]:
        """Get the first (highest priority) model."""
        result = await self.fetchone(
            "SELECT name FROM models ORDER BY sort_order ASC LIMIT 1"
        )
        return result["name"] if result else None
    
    async def add(self, name: str) -> None:
        """Add a model to the end of the registry."""
        # Get current max sort_order
        result = await self.fetchone(
            "SELECT MAX(sort_order) as max_order FROM models"
        )
        max_order = result["max_order"] if result and result["max_order"] else 0
        new_order = max_order + 1
        
        await self.execute(
            "INSERT INTO models (name, sort_order, added_at) VALUES (?, ?, ?)",
            (name, new_order, datetime.utcnow().isoformat())
        )
    
    async def delete(self, name: str) -> None:
        """Delete a model from the registry."""
        await self.execute(
            "DELETE FROM models WHERE name = ?",
            (name,)
        )
    
    async def replace_all(self, names: List[str]) -> None:
        """Replace the entire model registry with a new ordered list."""
        # Clear existing
        await self.execute("DELETE FROM models")
        
        # Insert new with order
        for i, name in enumerate(names):
            await self.execute(
                "INSERT INTO models (name, sort_order, added_at) VALUES (?, ?, ?)",
                (name, i, datetime.utcnow().isoformat())
            )
    
    async def count(self) -> int:
        """Get the total number of models in the registry."""
        result = await self.fetchone("SELECT COUNT(*) as count FROM models")
        return result["count"] if result else 0
