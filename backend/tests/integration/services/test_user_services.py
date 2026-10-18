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
from app.services.user_services import UserService


class TestGetUserById:
    async def test_returns_existing_user(self, db_session: AsyncSession, make_user):
        created = await make_user(email="a@example.com")
        found = await UserService(db_session).get_user_by_id(created.id)
        assert found.id == created.id

    async def test_raises_for_missing_id(self, db_session: AsyncSession):
        with pytest.raises(UserIdDoesNotExist):
            await UserService(db_session).get_user_by_id(999999)


class TestGetUserByEmail:
    async def test_returns_existing_user(self, db_session: AsyncSession, make_user):
        await make_user(email="b@example.com")
        found = await UserService(db_session).get_user_by_email("b@example.com")
        assert found.email == "b@example.com"

    async def test_raises_for_missing_email(self, db_session: AsyncSession):
        with pytest.raises(UserEmailDoesNotExist):
            await UserService(db_session).get_user_by_email("nobody@example.com")


class TestGetUserByGoogleId:
    async def test_returns_existing_user(self, db_session: AsyncSession, make_user):
        await make_user(email="c@example.com", google_id="google-abc")
        found = await UserService(db_session).get_user_by_google_id("google-abc")
        assert found.google_id == "google-abc"

    async def test_raises_for_missing_google_id(self, db_session: AsyncSession):
        with pytest.raises(UserGoogleIdDoesNotExist):
            await UserService(db_session).get_user_by_google_id("no-such-id")


class TestCreateUserWithPassword:
    async def test_persists_hashed_password(self, db_session: AsyncSession):
        user_create = UserCreate(
            email="new@example.com",
            password="Str0ng!Pass",
            confirm_password="Str0ng!Pass",
        )
        user = await UserService(db_session).create_user_with_password(user_create)

        assert user.password != "Str0ng!Pass"
        assert verify_password("Str0ng!Pass", user.password) is True

    async def test_lowercases_email(self, db_session: AsyncSession):
        user_create = UserCreate(
            email="Mixed.Case@Example.com",
            password="Str0ng!Pass",
            confirm_password="Str0ng!Pass",
        )
        user = await UserService(db_session).create_user_with_password(user_create)
        assert user.email == "mixed.case@example.com"

    async def test_duplicate_email_raises(self, db_session: AsyncSession, make_user):
        await make_user(email="dupe@example.com")
        user_create = UserCreate(
            email="dupe@example.com",
            password="Str0ng!Pass",
            confirm_password="Str0ng!Pass",
        )
        with pytest.raises(UserAlreadyExists):
            await UserService(db_session).create_user_with_password(user_create)

    async def test_persists_an_empty_profile(self, db_session: AsyncSession):
        user_create = UserCreate(
            email="with-profile@example.com",
            password="Str0ng!Pass",
            confirm_password="Str0ng!Pass",
        )
        created = await UserService(db_session).create_user_with_password(user_create)
        user_id = created.id
        await db_session.commit()
        db_session.expire_all()

        found = await UserService(db_session).get_user_by_id(user_id)
        assert found.profile is not None
        assert found.profile.name is None


class TestCreateUserWithoutPassword:
    async def test_leaves_password_null(self, db_session: AsyncSession):
        user_create = UserCreate(
            email="google-user@example.com",
            google_id="google-xyz",
        )
        user = await UserService(db_session).create_user_without_password(user_create)
        assert user.password is None
        assert user.google_id == "google-xyz"

    async def test_duplicate_email_raises(self, db_session: AsyncSession, make_user):
        await make_user(email="dupe2@example.com")
        user_create = UserCreate(
            email="dupe2@example.com",
            google_id="google-xyz",
        )
        with pytest.raises(UserAlreadyExists):
            await UserService(db_session).create_user_without_password(user_create)

    async def test_persists_profile_with_prefilled_name(self, db_session: AsyncSession):
        user_create = UserCreate(email="google-profile@example.com", google_id="google-profile")
        created = await UserService(db_session).create_user_without_password(user_create, "Google User")
        user_id = created.id
        await db_session.commit()
        db_session.expire_all()

        found = await UserService(db_session).get_user_by_id(user_id)
        assert found.profile.name == "Google User"


class TestLinkGoogleId:
    async def test_persists_google_id(self, db_session: AsyncSession, make_user):
        created = await make_user(email="link@example.com")
        user_id = created.id

        await UserService(db_session).link_google_id(created, "google-link")
        await db_session.commit()
        db_session.expire_all()

        found = await UserService(db_session).get_user_by_google_id("google-link")
        assert found.id == user_id


class TestDeleteUser:
    async def test_removes_user(self, db_session: AsyncSession, make_user):
        created = await make_user(email="delete-me@example.com")
        user_id = created.id

        await UserService(db_session).delete_user(created)
        await db_session.commit()

        with pytest.raises(UserIdDoesNotExist):
            await UserService(db_session).get_user_by_id(user_id)
