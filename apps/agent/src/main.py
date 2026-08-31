import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from src.config import settings
from src.db.session import async_engine
from src.api.v1 import health, agent, knowledge

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("fastapi_agent")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Verify DB connectivity & pgvector availability
    logger.info("🚀 [FastAPI AI Agent] Initializing service...")
    try:
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            logger.info("✅ Database connection verified.")
    except Exception as e:
        logger.warning(f"⚠️ Database connectivity check: {e}")

    yield

    # Shutdown
    logger.info("🛑 [FastAPI AI Agent] Shutting down...")
    await async_engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    description="Multi-Agent LangGraph Intelligence, pgvector RAG & Voice Transcription Engine",
    version="2.0.0",
    lifespan=lifespan
)

# CORS Setup
origins = ["*"] if settings.CORS_ORIGINS == "*" else [o.strip() for o in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers under /api/v1 and /api
app.include_router(health.router, prefix="/api/v1")
app.include_router(agent.router, prefix="/api/v1")
app.include_router(knowledge.router, prefix="/api/v1")

# Also mount under /api for backwards compatibility and reverse proxy mapping
app.include_router(health.router, prefix="/api")
app.include_router(agent.router, prefix="/api")
app.include_router(knowledge.router, prefix="/api")


@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "ravisn-fastapi-langgraph-agent",
        "version": "2.0.0"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)
