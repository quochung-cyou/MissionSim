import httpx
from typing import List, Optional
from aiosqlite import Connection
from src.repositories.model_repository import ModelRepository
from src.repositories.config_repository import ConfigRepository
from src.config import settings
from src.utils.http import http_client
from src.utils.logger import logger
from src.exceptions import ModelExhaustedError, QwenAPIError


class QwenService:
    """Service for Qwen Cloud API calls with automatic model rotation."""
    
    def __init__(self, db: Connection):
        self.db = db
        self.model_repo = ModelRepository(db)
        self.config_repo = ConfigRepository(db)
    
    async def get_api_key(self) -> str:
        """Get the Qwen API key from config or settings."""
        # First check database
        db_key = await self.config_repo.get("qwen_api_key")
        if db_key:
            return db_key
        
        # Fall back to env var
        if settings.qwen_api_key:
            return settings.qwen_api_key
        
        raise QwenAPIError("Qwen API key not configured", status_code=503)
    
    async def get_active_model(self) -> str:
        """Get the current active model (first in registry)."""
        model = await self.model_repo.get_first()
        if not model:
            raise ModelExhaustedError("No models available in registry")
        return model
    
    async def drop_model(self, model_name: str) -> None:
        """Remove a model from the registry after it fails."""
        logger.warning(f"Dropping model from registry: {model_name}")
        await self.model_repo.delete(model_name)
    
    async def chat(
        self,
        messages: List[dict],
        temperature: float = 0.7,
        max_tokens: int = 2048,
        enable_thinking: bool = False
    ) -> tuple[str, str]:
        """
        Call Qwen API with automatic model rotation on 403/429.
        
        Returns:
            tuple: (content, model_used)
        """
        api_key = await self.get_api_key()
        
        # Try models in order until one succeeds
        last_error = None
        remaining_models = await self.model_repo.get_all_ordered()
        
        for model in remaining_models:
            try:
                logger.info(f"Attempting Qwen API call with model: {model}")
                content = await self._call_qwen(
                    api_key=api_key,
                    model=model,
                    messages=messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    enable_thinking=enable_thinking
                )
                logger.info(f"Qwen API call succeeded with model: {model}")
                return content, model
            
            except httpx.HTTPStatusError as e:
                last_error = str(e)
                status_code = e.response.status_code
                
                # Drop model on 403 or 429
                if status_code in (403, 429):
                    logger.warning(f"Model {model} failed with status {status_code}, dropping from registry")
                    await self.drop_model(model)
                    continue
                
                # Other errors should not drop the model
                logger.error(f"Model {model} failed with status {status_code}: {e}")
                raise QwenAPIError(f"Qwen API error: {e}", status_code=status_code)
            
            except Exception as e:
                last_error = str(e)
                logger.error(f"Model {model} failed with unexpected error: {e}")
                raise QwenAPIError(f"Qwen API error: {e}")
        
        # All models failed
        raise ModelExhaustedError(
            f"All models failed. Last error: {last_error}. {len(remaining_models)} models were attempted."
        )
    
    async def _call_qwen(
        self,
        api_key: str,
        model: str,
        messages: List[dict],
        temperature: float,
        max_tokens: int,
        enable_thinking: bool
    ) -> str:
        """Make a single call to the Qwen API."""
        url = f"{settings.qwen_base_url}/chat/completions"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        body = {
            "model": model,
            "messages": messages,
            "stream": False,
            "enable_thinking": enable_thinking,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        response = await http_client.post(url, json=body, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        if not content:
            raise QwenAPIError("Empty response from Qwen API")
        
        return content
