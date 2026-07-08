import httpx
from typing import Dict, Any, Optional
from src.config import settings


class HTTPClient:
    """Async HTTP client wrapper with timeout and error handling."""
    
    def __init__(self, timeout: float = 30.0):
        self.timeout = timeout
        self._client: Optional[httpx.AsyncClient] = None
    
    async def get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self.timeout)
        return self._client
    
    async def post(
        self,
        url: str,
        json: Dict[str, Any],
        headers: Optional[Dict[str, str]] = None
    ) -> httpx.Response:
        """Make a POST request."""
        client = await self.get_client()
        return await client.post(url, json=json, headers=headers)
    
    async def close(self) -> None:
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None


# Global HTTP client instance
http_client = HTTPClient()
