import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.password import verify_password
from app.exceptions.user import (
    UserAlreadyExists,
    UserEmailDoesNotExist,
    UserGoogleIdDoesNotExist,
    UserIdDoesNotExist,
)
from app.schema.user import UserCreate
from app.services.user_services import (
    create_user_with_password,
    create_user_without_password,
    get_user_by_email,
    get_user_by_google_id,
    get_user_by_id,
)


class TestGetUserById:
    async def test_returns_existing_user(self, db_session: AsyncSession, make_user):
        created = await make_user(email="a@example.com")
        found = await get_user_by_id(created.id, db_session)
        assert found.id == created.id

    async def test_raises_for_missing_id(self, db_session: AsyncSession):
        with pytest.raises(UserIdDoesNotExist):
            await get_user_by_id(999999, db_session)


class TestGetUserByEmail:
    async def test_returns_existing_user(self, db_session: AsyncSession, make_user):
        await make_user(email="b@example.com")
        found = await get_user_by_email("b@example.com", db_session)
        assert found.email == "b@example.com"

    async def test_raises_for_missing_email(self, db_session: AsyncSession):
        with pytest.raises(UserEmailDoesNotExist):
            await get_user_by_email("nobody@example.com", db_session)


class TestGetUserByGoogleId:
    async def test_returns_existing_user(self, db_session: AsyncSession, make_user):
        await make_user(email="c@example.com", google_id="google-abc")
        found = await get_user_by_google_id("google-abc", db_session)
        assert found.google_id == "google-abc"

    async def test_raises_for_missing_google_id(self, db_session: AsyncSession):
        with pytest.raises(UserGoogleIdDoesNotExist):
            await get_user_by_google_id("no-such-id", db_session)


class TestCreateUserWithPassword:
    async def test_persists_hashed_password(self, db_session: AsyncSession):
        user_create = UserCreate(
            email="new@example.com",
            name="New User",
            password="Str0ng!Pass",
            confirm_password="Str0ng!Pass",
        )
        user = await create_user_with_password(user_create, db_session)

        assert user.password != "Str0ng!Pass"
        assert verify_password("Str0ng!Pass", user.password) is True

    async def test_lowercases_email(self, db_session: AsyncSession):
        user_create = UserCreate(
            email="Mixed.Case@Example.com",
            name="New User",
            password="Str0ng!Pass",
            confirm_password="Str0ng!Pass",
        )
        user = await create_user_with_password(user_create, db_session)
        assert user.email == "mixed.case@example.com"

    async def test_duplicate_email_raises(self, db_session: AsyncSession, make_user):
        await make_user(email="dupe@example.com")
        user_create = UserCreate(
            email="dupe@example.com",
            name="New User",
            password="Str0ng!Pass",
            confirm_password="Str0ng!Pass",
        )
        with pytest.raises(UserAlreadyExists):
            await create_user_with_password(user_create, db_session)


class TestCreateUserWithoutPassword:
    async def test_leaves_password_null(self, db_session: AsyncSession):
        user_create = UserCreate(
            email="google-user@example.com",
            name="Google User",
            google_id="google-xyz",
        )
        user = await create_user_without_password(user_create, db_session)
        assert user.password is None
        assert user.google_id == "google-xyz"

    async def test_duplicate_email_raises(self, db_session: AsyncSession, make_user):
        await make_user(email="dupe2@example.com")
        user_create = UserCreate(
            email="dupe2@example.com",
            name="Google User",
            google_id="google-xyz",
        )
        with pytest.raises(UserAlreadyExists):
            await create_user_without_password(user_create, db_session)
