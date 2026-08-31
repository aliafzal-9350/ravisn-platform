from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis
from src.api.deps import get_db, get_redis

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/")
async def health_check():
    return {"status": "healthy", "service": "ravisn-fastapi-agent"}


@router.get("/ready")
async def readiness_probe(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis)
):
    db_ok = False
    redis_ok = False

    try:
        await db.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False

    try:
        pong = await redis.ping()
        redis_ok = (pong is True)
    except Exception:
        redis_ok = False

    status = "ok" if (db_ok and redis_ok) else "degraded"
    return {
        "status": status,
        "database": db_ok,
        "redis": redis_ok
    }
