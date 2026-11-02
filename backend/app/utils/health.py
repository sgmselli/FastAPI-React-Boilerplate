import asyncio
import logging
from typing import Awaitable, Callable

from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings

logger = logging.getLogger(__name__)

CHECK_TIMEOUT_SECONDS = 2

async def check_database(session: AsyncSession) -> None:
    await session.execute(text("SELECT 1"))

async def check_redis() -> None:
    redis = Redis(
        host=settings.redis_host,
        port=settings.redis_port,
        db=settings.redis_db,
        password=settings.redis_password,
        socket_connect_timeout=CHECK_TIMEOUT_SECONDS,
        socket_timeout=CHECK_TIMEOUT_SECONDS,
    )
    try:
        await redis.ping()
    finally:
        await redis.aclose()

async def run_check(name: str, check: Callable[[], Awaitable[None]]) -> str:
    try:
        await asyncio.wait_for(check(), CHECK_TIMEOUT_SECONDS)
        return "ok"
    except Exception:
        logger.warning("Health check failed for %s", name, exc_info=True)
        return "unavailable"

async def check_dependencies(session: AsyncSession) -> dict[str, str]:
    database, redis = await asyncio.gather(
        run_check("database", lambda: check_database(session)),
        run_check("redis", check_redis),
    )
    return {"database": database, "redis": redis}
