from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.core.config import settings

engine = create_async_engine(settings.async_driver_database_url)

AsyncSessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession, 
    autocommit=False, 
    autoflush=False
)

async def get_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

