import pytest

from app.exceptions.user import (
    UserAlreadyExists,
    UserEmailDoesNotExist,
    UserGoogleIdDoesNotExist,
    UserIdDoesNotExist,
)
from app.models.user import User
from app.schema.user import UserCreate
from app.services.user_services import UserService
from tests.unit.mocks import make_mock_session


class TestGetUserById:
    async def test_returns_user_when_found(self):
        fake_user = User(id=1, email="a@example.com")
        session = make_mock_session(first_return=fake_user)

        result = await UserService(session).get_user_by_id(1)

        assert result is fake_user

    async def test_raises_when_not_found(self):
        session = make_mock_session(first_return=None)

        with pytest.raises(UserIdDoesNotExist):
            await UserService(session).get_user_by_id(999)


class TestGetUserByEmail:
    async def test_returns_user_when_found(self):
        fake_user = User(id=1, email="a@example.com")
        session = make_mock_session(first_return=fake_user)

        result = await UserService(session).get_user_by_email("a@example.com")

        assert result is fake_user

    async def test_raises_when_not_found(self):
        session = make_mock_session(first_return=None)

        with pytest.raises(UserEmailDoesNotExist):
            await UserService(session).get_user_by_email("nobody@example.com")


class TestGetUserByGoogleId:
    async def test_returns_user_when_found(self):
        fake_user = User(id=1, email="a@example.com", google_id="g-1")
        session = make_mock_session(first_return=fake_user)

        result = await UserService(session).get_user_by_google_id("g-1")

        assert result is fake_user

    async def test_raises_when_not_found(self):
        session = make_mock_session(first_return=None)

        with pytest.raises(UserGoogleIdDoesNotExist):
            await UserService(session).get_user_by_google_id("missing")


class TestCreateUserWithPassword:
    async def test_hashes_password_before_persisting(self, mocker):
        session = make_mock_session(first_return=None)  # no existing user
        mock_hash = mocker.patch(
            "app.services.user_services.hash_password", return_value="hashed-value"
        )
        user_create = UserCreate(
            email="New@Example.com",
            password="Str0ng!Pass",
            confirm_password="Str0ng!Pass",
        )

        user = await UserService(session).create_user_with_password(user_create)

        mock_hash.assert_called_once_with("Str0ng!Pass")
        assert user.password == "hashed-value"
        assert user.email == "new@example.com"
        session.add.assert_called_once()
        session.flush.assert_awaited_once()

    async def test_raises_without_persisting_when_email_taken(self, mocker):
        existing = User(id=1, email="dupe@example.com")
        session = make_mock_session(first_return=existing)
        mocker.patch("app.services.user_services.hash_password")
        user_create = UserCreate(
            email="dupe@example.com",
            password="Str0ng!Pass",
            confirm_password="Str0ng!Pass",
        )

        with pytest.raises(UserAlreadyExists):
            await UserService(session).create_user_with_password(user_create)

        session.add.assert_not_called()
        session.flush.assert_not_awaited()

    async def test_creates_an_empty_profile_with_the_user(self, mocker):
        session = make_mock_session(first_return=None)
        mocker.patch("app.services.user_services.hash_password", return_value="hashed-value")
        user_create = UserCreate(
            email="new@example.com",
            password="Str0ng!Pass",
            confirm_password="Str0ng!Pass",
        )

        user = await UserService(session).create_user_with_password(user_create)

        assert user.profile is not None
        assert user.profile.name is None
        session.add.assert_called_once_with(user)


class TestCreateUserWithoutPassword:
    async def test_persists_user_with_no_password(self):
        session = make_mock_session(first_return=None)
        user_create = UserCreate(
            email="google@example.com",
            google_id="g-2",
        )

        user = await UserService(session).create_user_without_password(user_create)

        assert user.password is None
        assert user.google_id == "g-2"
        session.add.assert_called_once()
        session.flush.assert_awaited_once()

    async def test_raises_without_persisting_when_email_taken(self):
        existing = User(id=1, email="dupe2@example.com")
        session = make_mock_session(first_return=existing)
        user_create = UserCreate(
            email="dupe2@example.com",
            google_id="g-2",
        )

        with pytest.raises(UserAlreadyExists):
            await UserService(session).create_user_without_password(user_create)

        session.add.assert_not_called()

    async def test_creates_an_empty_profile_with_the_user(self):
        session = make_mock_session(first_return=None)
        user_create = UserCreate(email="google@example.com", google_id="g-2")

        user = await UserService(session).create_user_without_password(user_create)

        assert user.profile is not None
        assert user.profile.name is None


class TestLinkGoogleId:
    async def test_sets_google_id_and_flushes(self):
        user = User(id=1, email="a@example.com", password="hash")
        session = make_mock_session()

        result = await UserService(session).link_google_id(user, "g-1")

        assert result is user
        assert user.google_id == "g-1"
        assert user.password == "hash"
        session.add.assert_called_once_with(user)
        session.flush.assert_awaited_once()
        session.commit.assert_not_awaited()


class TestDeleteUser:
    async def test_deletes_user_and_flushes_without_committing(self):
        user = User(id=1, email="a@example.com")
        session = make_mock_session()

        await UserService(session).delete_user(user)

        session.delete.assert_awaited_once_with(user)
        session.flush.assert_awaited_once()
        session.commit.assert_not_awaited()
