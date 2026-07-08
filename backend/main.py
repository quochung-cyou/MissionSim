from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from src.config import settings
from src.database import init_db
from src.utils.http import http_client
from src.utils.logger import logger
from src.routes import admin, chat, sessions, records


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting MissionSim backend...")
    await init_db()
    logger.info("Database initialized")
    
    yield
    
    # Shutdown
    logger.info("Shutting down MissionSim backend...")
    await http_client.close()
    logger.info("HTTP client closed")


# Create FastAPI app
app = FastAPI(
    title="MissionSim Backend",
    description="Backend API for MissionSim - LLM proxy and session management",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(admin.router)
app.include_router(chat.router)
app.include_router(sessions.router)
app.include_router(records.router)


@app.get("/")
async def root():
    """Root endpoint for health check."""
    return {
        "name": "MissionSim Backend",
        "version": "1.0.0",
        "status": "running"
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    
    logger.info(f"Starting server on {settings.host}:{settings.port}")
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=True,
        log_level="info"
    )
