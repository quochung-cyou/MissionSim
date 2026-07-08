from fastapi import HTTPException, status


class ConfigError(HTTPException):
    """Raised when config operations fail."""
    def __init__(self, detail: str = "Configuration error"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class ModelExhaustedError(HTTPException):
    """Raised when all models in the registry have failed."""
    def __init__(self, detail: str = "No models available"):
        super().__init__(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=detail)


class SessionNotFoundError(HTTPException):
    """Raised when a session is not found."""
    def __init__(self, detail: str = "Session not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class QwenAPIError(HTTPException):
    """Raised when Qwen API call fails."""
    def __init__(self, detail: str = "Qwen API error", status_code: int = status.HTTP_502_BAD_GATEWAY):
        super().__init__(status_code=status_code, detail=detail)
