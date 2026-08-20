import pytest

from app.exceptions.user import (
    UserAlreadyExists,
    UserEmailDoesNotExist,
    UserGoogleIdDoesNotExist,
    UserIdDoesNotExist,
)
from app.models.user import User
from app.schema.user import UserCreate
from app.services import user_services
from tests.unit.mocks import make_mock_session


class TestGetUserById:
    async def test_returns_user_when_found(self):
        fake_user = User(id=1, email="a@example.com", name="A")
        session = make_mock_session(first_return=fake_user)

        result = await user_services.get_user_by_id(1, session)

        assert result is fake_user

    async def test_raises_when_not_found(self):
        session = make_mock_session(first_return=None)

        with pytest.raises(UserIdDoesNotExist):
            await user_services.get_user_by_id(999, session)


class TestGetUserByEmail:
    async def test_returns_user_when_found(self):
        fake_user = User(id=1, email="a@example.com", name="A")
        session = make_mock_session(first_return=fake_user)

        result = await user_services.get_user_by_email("a@example.com", session)

        assert result is fake_user

    async def test_raises_when_not_found(self):
        session = make_mock_session(first_return=None)

        with pytest.raises(UserEmailDoesNotExist):
            await user_services.get_user_by_email("nobody@example.com", session)


class TestGetUserByGoogleId:
    async def test_returns_user_when_found(self):
        fake_user = User(id=1, email="a@example.com", name="A", google_id="g-1")
        session = make_mock_session(first_return=fake_user)

        result = await user_services.get_user_by_google_id("g-1", session)

        assert result is fake_user

    async def test_raises_when_not_found(self):
        session = make_mock_session(first_return=None)

        with pytest.raises(UserGoogleIdDoesNotExist):
            await user_services.get_user_by_google_id("missing", session)


class TestCreateUserWithPassword:
    async def test_hashes_password_before_persisting(self, mocker):
        session = make_mock_session(first_return=None)  # no existing user
        mock_hash = mocker.patch(
            "app.services.user_services.hash_password", return_value="hashed-value"
        )
        user_create = UserCreate(
            email="New@Example.com",
            name="New User",
            password="Str0ng!Pass",
            confirm_password="Str0ng!Pass",
        )

        user = await user_services.create_user_with_password(user_create, session)

        mock_hash.assert_called_once_with("Str0ng!Pass")
        assert user.password == "hashed-value"
        assert user.email == "new@example.com"
        session.add.assert_called_once()
        session.commit.assert_awaited_once()
        session.refresh.assert_awaited_once()

    async def test_raises_without_persisting_when_email_taken(self, mocker):
        existing = User(id=1, email="dupe@example.com", name="Existing")
        session = make_mock_session(first_return=existing)
        mocker.patch("app.services.user_services.hash_password")
        user_create = UserCreate(
            email="dupe@example.com",
            name="New User",
            password="Str0ng!Pass",
            confirm_password="Str0ng!Pass",
        )

        with pytest.raises(UserAlreadyExists):
            await user_services.create_user_with_password(user_create, session)

        session.add.assert_not_called()
        session.commit.assert_not_awaited()


class TestCreateUserWithoutPassword:
    async def test_persists_user_with_no_password(self):
        session = make_mock_session(first_return=None)
        user_create = UserCreate(
            email="google@example.com",
            name="Google User",
            google_id="g-2",
        )

        user = await user_services.create_user_without_password(user_create, session)

        assert user.password is None
        assert user.google_id == "g-2"
        session.add.assert_called_once()
        session.commit.assert_awaited_once()

    async def test_raises_without_persisting_when_email_taken(self):
        existing = User(id=1, email="dupe2@example.com", name="Existing")
        session = make_mock_session(first_return=existing)
        user_create = UserCreate(
            email="dupe2@example.com",
            name="Google User",
            google_id="g-2",
        )

        with pytest.raises(UserAlreadyExists):
            await user_services.create_user_without_password(user_create, session)

        session.add.assert_not_called()