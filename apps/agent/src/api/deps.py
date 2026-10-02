import hmac
import logging
from typing import AsyncGenerator, Optional
from fastapi import Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis
from src.db.session import async_session_factory
from src.config import settings

logger = logging.getLogger(__name__)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


async def get_redis() -> AsyncGenerator[Redis, None]:
    client = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        yield client
    finally:
        await client.aclose()


async def require_internal_token(x_internal_token: Optional[str] = Header(default=None)) -> None:
    """Only Laravel may call the agent API: it sends the shared INTERNAL_API_TOKEN.

    Fails closed in production when no token is configured, so a missing secret
    can never silently turn the knowledge and agent endpoints public again.
    """
    expected = settings.INTERNAL_API_TOKEN

    if not expected:
        if settings.is_production:
            logger.error("[Auth] INTERNAL_API_TOKEN is not configured; refusing agent API request.")
            raise HTTPException(status_code=503, detail="Agent API is not configured.")
        return

    if not x_internal_token or not hmac.compare_digest(x_internal_token, expected):
        raise HTTPException(status_code=401, detail="Invalid or missing internal token.")
