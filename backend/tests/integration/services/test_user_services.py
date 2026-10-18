import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.password import verify_password
from app.exceptions.user import (
    UserAlreadyExists,
    UserEmailDoesNotExist,
    UserGoogleIdDoesNotExist,
    UserIdDoesNotExist,
)
from app.schema.user import UserCreate, UserUpdate
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
            name="New User",
            password="Str0ng!Pass",
            confirm_password="Str0ng!Pass",
        )
        user = await UserService(db_session).create_user_with_password(user_create)

        assert user.password != "Str0ng!Pass"
        assert verify_password("Str0ng!Pass", user.password) is True

    async def test_lowercases_email(self, db_session: AsyncSession):
        user_create = UserCreate(
            email="Mixed.Case@Example.com",
            name="New User",
            password="Str0ng!Pass",
            confirm_password="Str0ng!Pass",
        )
        user = await UserService(db_session).create_user_with_password(user_create)
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
            await UserService(db_session).create_user_with_password(user_create)


class TestCreateUserWithoutPassword:
    async def test_leaves_password_null(self, db_session: AsyncSession):
        user_create = UserCreate(
            email="google-user@example.com",
            name="Google User",
            google_id="google-xyz",
        )
        user = await UserService(db_session).create_user_without_password(user_create)
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
            await UserService(db_session).create_user_without_password(user_create)


class TestUpdateUser:
    async def test_persists_new_name(self, db_session: AsyncSession, make_user):
        created = await make_user(email="rename@example.com", name="Old Name")

        user_id = created.id

        await UserService(db_session).update_user(created, UserUpdate(name="New Name"))
        await db_session.commit()
        db_session.expire_all()

        found = await UserService(db_session).get_user_by_id(user_id)
        assert found.name == "New Name"
        assert found.email == "rename@example.com"


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
