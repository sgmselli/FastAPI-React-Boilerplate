from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.core.config import settings

engine = create_async_engine(settings.async_driver_database_url)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession, 
    autocommit=False,
    autoflush=False,
    expire_on_commit=False
)

async def get_session() -> AsyncSession:
    """
    Yields a session whose transaction spans the whole request.

    Committing here rather than in the services means a request is all or
    nothing: several writes either land together or none of them do, and any
    exception - including an HTTPException - rolls the whole request back.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise

