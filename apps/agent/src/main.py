import logging
from contextlib import asynccontextmanager
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from src.config import settings
from src.db.session import async_engine
from src.api.v1 import health, agent, knowledge
from src.api.deps import require_internal_token

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


# Interactive API docs would map the internal surface for an attacker; only
# serve them outside production.
docs_enabled = not settings.is_production

app = FastAPI(
    title=settings.APP_NAME,
    description="Multi-Agent LangGraph Intelligence, pgvector RAG & Voice Transcription Engine",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs" if docs_enabled else None,
    redoc_url="/redoc" if docs_enabled else None,
    openapi_url="/openapi.json" if docs_enabled else None,
)

# CORS: the agent is called server-to-server by Laravel, so browsers get no
# access unless origins are listed explicitly. A wildcard is never combined
# with credentials.
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()]
if origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials="*" not in origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

internal_only = [Depends(require_internal_token)]

# Mount Routers under /api/v1 and /api (backwards compatibility). Health stays
# open for container probes; everything else requires Laravel's internal token.
for prefix in ("/api/v1", "/api"):
    app.include_router(health.router, prefix=prefix)
    app.include_router(agent.router, prefix=prefix, dependencies=internal_only)
    app.include_router(knowledge.router, prefix=prefix, dependencies=internal_only)


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
