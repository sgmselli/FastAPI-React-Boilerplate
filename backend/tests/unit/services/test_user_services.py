import pytest

from app.exceptions.user import (
    UserAlreadyExists,
    UserEmailDoesNotExist,
    UserGoogleIdDoesNotExist,
    UserIdDoesNotExist,
)
from app.models.user import User
from app.schema.user import UserCreate, UserUpdate
from app.services.user_services import UserService
from tests.unit.mocks import make_mock_session


class TestGetUserById:
    async def test_returns_user_when_found(self):
        fake_user = User(id=1, email="a@example.com", name="A")
        session = make_mock_session(first_return=fake_user)

        result = await UserService(session).get_user_by_id(1)

        assert result is fake_user

    async def test_raises_when_not_found(self):
        session = make_mock_session(first_return=None)

        with pytest.raises(UserIdDoesNotExist):
            await UserService(session).get_user_by_id(999)


class TestGetUserByEmail:
    async def test_returns_user_when_found(self):
        fake_user = User(id=1, email="a@example.com", name="A")
        session = make_mock_session(first_return=fake_user)

        result = await UserService(session).get_user_by_email("a@example.com")

        assert result is fake_user

    async def test_raises_when_not_found(self):
        session = make_mock_session(first_return=None)

        with pytest.raises(UserEmailDoesNotExist):
            await UserService(session).get_user_by_email("nobody@example.com")


class TestGetUserByGoogleId:
    async def test_returns_user_when_found(self):
        fake_user = User(id=1, email="a@example.com", name="A", google_id="g-1")
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
            name="New User",
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
            await UserService(session).create_user_with_password(user_create)

        session.add.assert_not_called()
        session.flush.assert_not_awaited()


class TestCreateUserWithoutPassword:
    async def test_persists_user_with_no_password(self):
        session = make_mock_session(first_return=None)
        user_create = UserCreate(
            email="google@example.com",
            name="Google User",
            google_id="g-2",
        )

        user = await UserService(session).create_user_without_password(user_create)

        assert user.password is None
        assert user.google_id == "g-2"
        session.add.assert_called_once()
        session.flush.assert_awaited_once()

    async def test_raises_without_persisting_when_email_taken(self):
        existing = User(id=1, email="dupe2@example.com", name="Existing")
        session = make_mock_session(first_return=existing)
        user_create = UserCreate(
            email="dupe2@example.com",
            name="Google User",
            google_id="g-2",
        )

        with pytest.raises(UserAlreadyExists):
            await UserService(session).create_user_without_password(user_create)

        session.add.assert_not_called()


class TestUpdateUser:
    async def test_applies_new_name_and_flushes(self):
        user = User(id=1, email="a@example.com", name="Old Name")
        session = make_mock_session()

        result = await UserService(session).update_user(user, UserUpdate(name="New Name"))

        assert result is user
        assert user.name == "New Name"
        session.add.assert_called_once_with(user)
        session.flush.assert_awaited_once()
        session.commit.assert_not_awaited()

    async def test_leaves_other_fields_untouched(self):
        user = User(id=1, email="a@example.com", name="Old Name", password="hash", google_id="g-1")
        session = make_mock_session()

        await UserService(session).update_user(user, UserUpdate(name="New Name"))

        assert user.email == "a@example.com"
        assert user.password == "hash"
        assert user.google_id == "g-1"


class TestLinkGoogleId:
    async def test_sets_google_id_and_flushes(self):
        user = User(id=1, email="a@example.com", name="A", password="hash")
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
        user = User(id=1, email="a@example.com", name="A")
        session = make_mock_session()

        await UserService(session).delete_user(user)

        session.delete.assert_awaited_once_with(user)
        session.flush.assert_awaited_once()
        session.commit.assert_not_awaited()
