from uuid import uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import create_access_token, create_refresh_token
from app.exceptions.s3 import S3ClientException
from app.exceptions.user import UserEmailDoesNotExist
from app.external_services.s3_client import S3Client
from app.models.password_reset_token import PasswordResetToken
from app.services.user_services import UserService


class TestRegister:
    async def test_returns_201_with_user_shape(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/user/register",
            json={
                "email": "new@example.com",
                "password": "Str0ng!Pass",
                "confirm_password": "Str0ng!Pass",
            },
        )

        assert response.status_code == 201
        body = response.json()
        assert body["email"] == "new@example.com"
        assert body["display_name"] == "new@example.com"
        assert body["profile"] == {"name": None, "is_profile_completed": False, "profile_picture_url": None}
        assert "password" not in body

    async def test_does_not_sign_the_user_in(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/user/register",
            json={
                "email": "notsignedin@example.com",
                "password": "Str0ng!Pass",
                "confirm_password": "Str0ng!Pass",
            },
        )

        assert response.cookies.get("access_token") is None
        assert response.cookies.get("refresh_token") is None

    async def test_persists_user(self, client: AsyncClient, db_session: AsyncSession):
        await client.post(
            "/api/v1/user/register",
            json={
                "email": "persisted@example.com",
                "password": "Str0ng!Pass",
                "confirm_password": "Str0ng!Pass",
            },
        )

        user = await UserService(db_session).get_user_by_email("persisted@example.com")
        assert user.profile is not None
        assert user.profile.name is None
        assert user.email_verified_at is None

    async def test_queues_a_code_addressed_to_the_email(self, client: AsyncClient, mocker):
        # A new account has no profile name yet, so the email stands in for it.
        queued_otp_email = mocker.patch("app.router.v1.user.task_send_otp_email")

        await client.post(
            "/api/v1/user/register",
            json={
                "email": "code@example.com",
                "password": "Str0ng!Pass",
                "confirm_password": "Str0ng!Pass",
            },
        )

        queued_otp_email.delay.assert_called_once()
        to_email, name, code = queued_otp_email.delay.call_args.args
        assert (to_email, name) == ("code@example.com", "code@example.com")
        assert len(code) == 6 and code.isdigit()

    async def test_welcome_email_waits_for_verification(self, client: AsyncClient, mocker):
        queued_welcome_email = mocker.patch("app.router.v1.auth.otp.task_send_welcome_email")

        await client.post(
            "/api/v1/user/register",
            json={
                "email": "notyet@example.com",
                "password": "Str0ng!Pass",
                "confirm_password": "Str0ng!Pass",
            },
        )

        queued_welcome_email.delay.assert_not_called()

    async def test_duplicate_email_returns_409(self, client: AsyncClient, make_user):
        await make_user(email="dupe@example.com")

        response = await client.post(
            "/api/v1/user/register",
            json={
                "email": "dupe@example.com",
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
                "password": "weak",
                "confirm_password": "weak",
            },
        )

        assert response.status_code == 422


class TestCurrentUser:
    async def test_authenticated_returns_user(self, client: AsyncClient, make_user):
        user = await make_user(email="current@example.com", name="Current User")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.get("/api/v1/user/current")

        assert response.status_code == 200
        body = response.json()
        assert body["email"] == "current@example.com"
        assert body["display_name"] == "Current User"
        assert body["profile"] == {"name": "Current User", "is_profile_completed": True, "profile_picture_url": None}

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

    async def test_deletes_profile_picture_from_storage(
        self, client: AsyncClient, s3_client, make_user, db_session: AsyncSession
    ):
        user = await make_user(email="delete-picture@example.com")
        user.profile.profile_picture_key = "profile-pictures/1/me.webp"
        await db_session.commit()
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.delete("/api/v1/user/current")

        assert response.status_code == 204
        s3_client.delete_object_quietly.assert_awaited_once_with("profile-pictures/1/me.webp")

    async def test_without_a_profile_picture_storage_is_untouched(self, client: AsyncClient, s3_client, make_user):
        user = await make_user(email="delete-no-picture@example.com")
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))

        response = await client.delete("/api/v1/user/current")

        assert response.status_code == 204
        s3_client.delete_object_quietly.assert_not_awaited()

    async def test_storage_failure_still_deletes_account(
        self, client: AsyncClient, s3_client, make_user, db_session: AsyncSession
    ):
        user = await make_user(email="delete-s3-down@example.com")
        user.profile.profile_picture_key = "profile-pictures/1/me.webp"
        await db_session.commit()
        client.cookies.set("access_token", create_access_token({"sub": str(user.id)}))
        # Exercise the real quiet delete, with the underlying delete failing
        s3_client.delete_object.side_effect = S3ClientException()

        async def real_delete_object_quietly(key):
            await S3Client.delete_object_quietly(s3_client, key)

        s3_client.delete_object_quietly.side_effect = real_delete_object_quietly

        response = await client.delete("/api/v1/user/current")

        assert response.status_code == 204
        s3_client.delete_object.assert_awaited_once_with("profile-pictures/1/me.webp")
        db_session.expire_all()
        with pytest.raises(UserEmailDoesNotExist):
            await UserService(db_session).get_user_by_email("delete-s3-down@example.com")

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
