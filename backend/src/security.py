from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from src.config import settings
from typing import Annotated


security = HTTPBasic()


def verify_admin(credentials: Annotated[HTTPBasicCredentials, Security(security)]) -> None:
    """Verify admin credentials using Basic Auth."""
    correct_username = "admin"
    correct_password = settings.admin_password
    
    if credentials.username != correct_username or credentials.password != correct_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
