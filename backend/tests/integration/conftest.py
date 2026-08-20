from pathlib import Path

import pytest
import pytest_asyncio
from alembic import command
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.auth.password import hash_password
from app.core.config import settings
from app.db.session import get_session
from app.main import app
from app.models.user import User

BACKEND_ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture(scope="session", autouse=True)
def migrate_test_database():
    """
    Bring the test database up to head before anything runs, so adding a
    migration never means remembering to apply it here by hand - the dev
    database already gets this for free via run.sh on container start.

    Deliberately runs the real migrations rather than
    Base.metadata.create_all(): create_all() builds the schema from the
    models directly and would happily mask a migration that's broken or
    out of sync with them.

    alembic.ini's script_location is relative to cwd (it assumes you run
    alembic from backend/), so it's overridden with an absolute path here
    to keep pytest working from any directory.
    """
    config = Config(str(BACKEND_ROOT / "app" / "db" / "migrations" / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_ROOT / "app" / "db" / "migrations"))
    command.upgrade(config, "head")


@pytest_asyncio.fixture
async def db_session():
    """
    One connection per test, wrapped in an outer transaction that's always
    rolled back at teardown - so tests never see each other's data and
    there's no truncate/reset step between them.

    Service code under test calls session.commit() (see user_services.py -
    that's a deliberate choice there, not something being worked around).
    Each commit ends the SAVEPOINT we're nested in, so a listener re-opens
    one immediately after - the *outer* transaction stays the only thing
    that actually persists, and that's what gets rolled back below. This
    is SQLAlchemy's documented pattern for joining a session into an
    external transaction for tests (async variant).
    """
    engine = create_async_engine(settings.async_driver_database_url, poolclass=NullPool)

    async with engine.connect() as conn:
        await conn.begin()
        await conn.begin_nested()

        session_factory = async_sessionmaker(bind=conn, expire_on_commit=False)
        session = session_factory()

        @event.listens_for(session.sync_session, "after_transaction_end")
        def _restart_savepoint(sess, transaction):
            if conn.closed:
                return
            if not conn.in_nested_transaction():
                conn.sync_connection.begin_nested()

        try:
            yield session
        finally:
            await session.close()
            await conn.rollback()

    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    """
    ASGI test client wired to the same transaction-scoped session as the
    test itself, so direct DB assertions and requests made through the
    client see the same uncommitted data.
    """

    async def _get_session_override():
        yield db_session

    app.dependency_overrides[get_session] = _get_session_override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# bcrypt hashing is ~250ms/call - hash once per session and reuse for
# fixture users instead of re-hashing for every test that needs one.
@pytest.fixture(scope="session")
def shared_password() -> str:
    return "Str0ng!Pass"


@pytest.fixture(scope="session")
def shared_password_hash(shared_password: str) -> str:
    return hash_password(shared_password)


@pytest_asyncio.fixture
async def make_user(db_session: AsyncSession, shared_password_hash: str):
    """
    Factory fixture: make_user(email=..., name=..., google_id=None, password=<hash|None>).
    Bypasses the service layer (and its own hashing) - pass a hash directly,
    or omit `password` to get one hashed from `shared_password`.
    """

    async def _make(
        email: str = "user@example.com",
        name: str = "Test User",
        google_id: str | None = None,
        password: str | None = shared_password_hash,
    ) -> User:
        user = User(
            email=email.strip().lower(),
            name=name,
            google_id=google_id,
            password=password,
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user

    return _make
