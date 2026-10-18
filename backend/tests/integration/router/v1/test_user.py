from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import create_access_token, create_refresh_token
from app.exceptions.user import UserEmailDoesNotExist
from app.models.password_reset_token import PasswordResetToken
from app.services.user_services import UserService


class TestRegister:
    async def test_returns_201_with_user_shape(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/user/register",
            json={
                "email": "new@example.com",
                "name": "New User",
                "password": "Str0ng!Pass",
                "confirm_password": "Str0ng!Pass",
            },
        )

        assert response.status_code == 201
        body = response.json()
        assert body["email"] == "new@example.com"
        assert body["name"] == "New User"
        assert "password" not in body

    async def test_persists_user(self, client: AsyncClient, db_session: AsyncSession):
        await client.post(
            "/api/v1/user/register",
            json={
                "email": "persisted@example.com",
                "name": "Persisted User",
                "password": "Str0ng!Pass",
                "confirm_password": "Str0ng!Pass",
            },
        )

        user = await UserService(db_session).get_user_by_email("persisted@example.com")
        assert user.name == "Persisted User"

    async def test_duplicate_email_returns_409(self, client: AsyncClient, make_user):
        await make_user(email="dupe@example.com")

        response = await client.post(
            "/api/v1/user/register",
            json={
                "email": "dupe@example.com",
                "name": "Another User",
                "password": "Str0ng!Pass",
                "confirm_password": "Str0ng!Pass",
            },
        )

        assert response.status_code == 409

    async def test_invalid_payload_returns_422(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/user/register",
            json={
                "email": "not-an-email",
                "name": "X",
                "password": "weak",
                "confirm_password": "weak",
            },
        )

        assert response.status_code == 422


class TestCurrentUser:
    async def test_authenticated_returns_user(self, client: AsyncClient, make_user):
        user = await make_user(email="current@example.com")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.get("/api/v1/user/current")

        assert response.status_code == 200
        assert response.json()["email"] == "current@example.com"

    async def test_missing_cookie_returns_401(self, client: AsyncClient):
        response = await client.get("/api/v1/user/current")
        assert response.status_code == 401

    async def test_garbage_cookie_returns_401(self, client: AsyncClient):
        client.cookies.set("access_token", "not-a-jwt")

        response = await client.get("/api/v1/user/current")

        assert response.status_code == 401

    async def test_valid_token_for_deleted_user_returns_401(
        self, client: AsyncClient, make_user, db_session: AsyncSession
    ):
        user = await make_user(email="deleted@example.com")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        await db_session.delete(user)
        await db_session.commit()

        response = await client.get("/api/v1/user/current")

        assert response.status_code == 401


class TestUpdateCurrentUser:
    async def test_returns_200_with_updated_user(self, client: AsyncClient, make_user):
        user = await make_user(email="update@example.com", name="Old Name")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.patch("/api/v1/user/current", json={"name": "  New Name  "})

        assert response.status_code == 200
        body = response.json()
        assert body["name"] == "New Name"
        assert body["email"] == "update@example.com"
        assert "password" not in body

    async def test_persists_new_name(self, client: AsyncClient, make_user, db_session: AsyncSession):
        user = await make_user(email="update-persist@example.com", name="Old Name")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        await client.patch("/api/v1/user/current", json={"name": "New Name"})

        db_session.expire_all()
        found = await UserService(db_session).get_user_by_email("update-persist@example.com")
        assert found.name == "New Name"

    async def test_email_in_body_is_ignored(self, client: AsyncClient, make_user, db_session: AsyncSession):
        user = await make_user(email="keep-email@example.com", name="Old Name")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.patch(
            "/api/v1/user/current",
            json={"name": "New Name", "email": "hijack@example.com"},
        )

        assert response.status_code == 200
        assert response.json()["email"] == "keep-email@example.com"
        db_session.expire_all()
        found = await UserService(db_session).get_user_by_email("keep-email@example.com")
        assert found.name == "New Name"

    async def test_missing_cookie_returns_401(self, client: AsyncClient):
        response = await client.patch("/api/v1/user/current", json={"name": "New Name"})
        assert response.status_code == 401

    async def test_invalid_name_returns_422_and_does_not_persist(
        self, client: AsyncClient, make_user, db_session: AsyncSession
    ):
        user = await make_user(email="invalid-name@example.com", name="Old Name")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.patch("/api/v1/user/current", json={"name": "Jane@Doe!"})

        assert response.status_code == 422
        assert response.json()["detail"][0]["loc"] == ["body", "name"]
        db_session.expire_all()
        found = await UserService(db_session).get_user_by_email("invalid-name@example.com")
        assert found.name == "Old Name"

    async def test_missing_name_returns_422(self, client: AsyncClient, make_user):
        user = await make_user(email="missing-name@example.com")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.patch("/api/v1/user/current", json={})

        assert response.status_code == 422


@pytest.fixture
def queued_account_deleted_email(mocker):
    """Stands in for the Celery task so the test can see what would be queued."""
    return mocker.patch("app.router.v1.user.task_send_account_deleted_email")


class TestDeleteCurrentUser:
    async def test_returns_204_and_removes_user(
        self, client: AsyncClient, make_user, db_session: AsyncSession
    ):
        user = await make_user(email="delete@example.com")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.delete("/api/v1/user/current")

        assert response.status_code == 204
        assert response.content == b""
        db_session.expire_all()
        with pytest.raises(UserEmailDoesNotExist):
            await UserService(db_session).get_user_by_email("delete@example.com")

    async def test_clears_both_cookies(self, client: AsyncClient, make_user):
        user = await make_user(email="delete-cookies@example.com")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.delete("/api/v1/user/current")

        set_cookie_headers = response.headers.get_list("set-cookie")
        assert any(h.startswith("access_token=") for h in set_cookie_headers)
        assert any(h.startswith("refresh_token=") for h in set_cookie_headers)

    async def test_removes_password_reset_tokens(
        self, client: AsyncClient, make_user, db_session: AsyncSession
    ):
        user = await make_user(email="delete-tokens@example.com")
        user_id = user.id
        db_session.add(PasswordResetToken(user_id=user_id, token_hash="a" * 64))
        await db_session.commit()
        client.cookies.set("access_token", create_access_token({"sub": str(user_id)}))

        await client.delete("/api/v1/user/current")

        result = await db_session.execute(
            select(PasswordResetToken).where(PasswordResetToken.user_id == user_id)
        )
        assert result.scalars().all() == []

    async def test_old_tokens_are_rejected_afterwards(self, client: AsyncClient, make_user):
        user = await make_user(email="delete-sessions@example.com")
        access_token = create_access_token({"sub": str(user.id)})
        refresh_token = create_refresh_token({"sub": str(user.id), "jti": str(uuid4())})
        client.cookies.set("access_token", access_token)

        await client.delete("/api/v1/user/current")

        # Replay the tokens a client might still be holding
        client.cookies.clear()
        client.cookies.set("access_token", access_token)
        assert (await client.get("/api/v1/user/current")).status_code == 401

        client.cookies.clear()
        client.cookies.set("refresh_token", refresh_token)
        assert (await client.post("/api/v1/auth/refresh")).status_code == 401

    async def test_email_can_be_registered_again(self, client: AsyncClient, make_user):
        user = await make_user(email="reuse@example.com")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        await client.delete("/api/v1/user/current")
        client.cookies.clear()

        response = await client.post(
            "/api/v1/user/register",
            json={
                "email": "reuse@example.com",
                "name": "New User",
                "password": "Str0ng!Pass",
                "confirm_password": "Str0ng!Pass",
            },
        )

        assert response.status_code == 201

    async def test_missing_cookie_returns_401(self, client: AsyncClient):
        response = await client.delete("/api/v1/user/current")
        assert response.status_code == 401

    async def test_queues_account_deleted_email(
        self, client: AsyncClient, make_user, queued_account_deleted_email
    ):
        user = await make_user(email="goodbye@example.com", name="Goodbye User")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        await client.delete("/api/v1/user/current")

        queued_account_deleted_email.delay.assert_called_once_with(
            "goodbye@example.com", "Goodbye User"
        )

    async def test_still_deletes_when_email_cannot_be_queued(
        self, client: AsyncClient, make_user, db_session: AsyncSession, queued_account_deleted_email
    ):
        queued_account_deleted_email.delay.side_effect = ConnectionError("broker down")
        user = await make_user(email="no-broker@example.com")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.delete("/api/v1/user/current")

        assert response.status_code == 204
        db_session.expire_all()
        with pytest.raises(UserEmailDoesNotExist):
            await UserService(db_session).get_user_by_email("no-broker@example.com")

    async def test_no_email_when_not_authenticated(
        self, client: AsyncClient, queued_account_deleted_email
    ):
        await client.delete("/api/v1/user/current")

        queued_account_deleted_email.delay.assert_not_called()
