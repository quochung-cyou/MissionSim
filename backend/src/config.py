from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""
    
    # Server
    port: int = 3001
    host: str = "0.0.0.0"
    
    # Admin
    admin_password: str
    
    # Qwen Cloud (optional - can be set via admin API)
    qwen_api_key: Optional[str] = None
    
    # Database
    database_url: str = "sqlite:///./data/app.db"
    
    # Qwen API
    qwen_base_url: str = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1"
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


settings = Settings()
