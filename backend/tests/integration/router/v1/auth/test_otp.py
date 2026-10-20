from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.one_time_password import OneTimePassword
from app.services.one_time_password_services import OneTimePasswordService
from app.services.user_services import UserService

GENERIC_RESEND_MESSAGE = "If that account still needs verifying, we've sent a new code."


@pytest.fixture
def queued_otp_email(mocker):
    return mocker.patch("app.router.v1.auth.otp.task_send_otp_email")


@pytest.fixture
def queued_welcome_email(mocker):
    return mocker.patch("app.router.v1.auth.otp.task_send_welcome_email")


def wrong_code(raw_code: str) -> str:
    return "000000" if raw_code != "000000" else "111111"


async def get_code_row(db_session: AsyncSession, user_id: int) -> OneTimePassword:
    return await OneTimePasswordService(db_session).get_otp_by_user_id(user_id)


async def backdate(db_session: AsyncSession, user_id: int, **delta) -> None:
    otp = await get_code_row(db_session, user_id)
    otp.created_at = datetime.now(timezone.utc) - timedelta(**delta)
    await db_session.flush()


class TestVerify:
    async def test_correct_code_signs_the_user_in(
        self, client: AsyncClient, db_session: AsyncSession, make_user, queued_welcome_email
    ):
        user = await make_user(email="verify@example.com", email_verified=False)
        raw_code = await OneTimePasswordService(db_session).create(user.id)

        response = await client.post(
            "/api/v1/auth/otp/verify", json={"email": "verify@example.com", "code": raw_code}
        )

        assert response.status_code == 200
        assert response.json()["email"] == "verify@example.com"
        assert response.cookies.get("access_token") is not None
        assert response.cookies.get("refresh_token") is not None

    async def test_correct_code_verifies_the_email_and_sends_the_welcome_email(
        self, client: AsyncClient, db_session: AsyncSession, make_user, queued_welcome_email
    ):
        user = await make_user(email="verify2@example.com", name="Verify User", email_verified=False)
        raw_code = await OneTimePasswordService(db_session).create(user.id)

        await client.post(
            "/api/v1/auth/otp/verify", json={"email": "verify2@example.com", "code": raw_code}
        )

        refreshed = await UserService(db_session).get_user_by_email("verify2@example.com")
        assert refreshed.email_verified_at is not None
        queued_welcome_email.delay.assert_called_once_with("verify2@example.com", "Verify User")

    async def test_email_is_matched_case_insensitively(
        self, client: AsyncClient, db_session: AsyncSession, make_user, queued_welcome_email
    ):
        user = await make_user(email="verify3@example.com", email_verified=False)
        raw_code = await OneTimePasswordService(db_session).create(user.id)

        response = await client.post(
            "/api/v1/auth/otp/verify", json={"email": "Verify3@Example.com", "code": raw_code}
        )

        assert response.status_code == 200

    async def test_wrong_code_returns_400_and_counts_an_attempt(
        self, client: AsyncClient, db_session: AsyncSession, make_user, queued_welcome_email
    ):
        user = await make_user(email="verify4@example.com", email_verified=False)
        raw_code = await OneTimePasswordService(db_session).create(user.id)

        response = await client.post(
            "/api/v1/auth/otp/verify",
            json={"email": "verify4@example.com", "code": wrong_code(raw_code)},
        )

        assert response.status_code == 400
        assert response.cookies.get("access_token") is None
        otp = await get_code_row(db_session, user.id)
        await db_session.refresh(otp)
        assert otp.attempts == 1
        queued_welcome_email.delay.assert_not_called()

    async def test_locks_out_after_max_attempts_even_with_the_right_code(
        self, client: AsyncClient, db_session: AsyncSession, make_user
    ):
        user = await make_user(email="verify5@example.com", email_verified=False)
        raw_code = await OneTimePasswordService(db_session).create(user.id)

        for _ in range(settings.otp_max_attempts):
            await client.post(
                "/api/v1/auth/otp/verify",
                json={"email": "verify5@example.com", "code": wrong_code(raw_code)},
            )
        response = await client.post(
            "/api/v1/auth/otp/verify", json={"email": "verify5@example.com", "code": raw_code}
        )

        assert response.status_code == 400

    async def test_expired_code_returns_400(
        self, client: AsyncClient, db_session: AsyncSession, make_user
    ):
        user = await make_user(email="verify6@example.com", email_verified=False)
        raw_code = await OneTimePasswordService(db_session).create(user.id)
        await backdate(db_session, user.id, minutes=settings.otp_expire_minutes + 1)

        response = await client.post(
            "/api/v1/auth/otp/verify", json={"email": "verify6@example.com", "code": raw_code}
        )

        assert response.status_code == 400

    async def test_code_cannot_be_reused(
        self, client: AsyncClient, db_session: AsyncSession, make_user, queued_welcome_email
    ):
        user = await make_user(email="verify7@example.com", email_verified=False)
        raw_code = await OneTimePasswordService(db_session).create(user.id)
        await client.post(
            "/api/v1/auth/otp/verify", json={"email": "verify7@example.com", "code": raw_code}
        )
        client.cookies.clear()

        response = await client.post(
            "/api/v1/auth/otp/verify", json={"email": "verify7@example.com", "code": raw_code}
        )

        assert response.status_code == 400
        assert response.cookies.get("access_token") is None

    async def test_unknown_email_returns_the_same_400(self, client: AsyncClient):
        response = await client.post(
            "/api/v1/auth/otp/verify", json={"email": "nobody@example.com", "code": "123456"}
        )

        assert response.status_code == 400
        assert response.json()["detail"] == "This code is invalid or has expired."

    async def test_another_users_code_does_not_work(
        self, client: AsyncClient, db_session: AsyncSession, make_user
    ):
        owner = await make_user(email="verify-owner@example.com", email_verified=False)
        await make_user(email="verify-other@example.com", email_verified=False)
        raw_code = await OneTimePasswordService(db_session).create(owner.id)

        response = await client.post(
            "/api/v1/auth/otp/verify", json={"email": "verify-other@example.com", "code": raw_code}
        )

        assert response.status_code == 400

    @pytest.mark.parametrize("code", ["12345", "1234567", "abcdef", ""])
    async def test_malformed_code_returns_422(self, client: AsyncClient, code: str):
        response = await client.post(
            "/api/v1/auth/otp/verify", json={"email": "verify@example.com", "code": code}
        )

        assert response.status_code == 422


class TestResend:
    async def test_after_the_cooldown_sends_a_new_code_that_verifies(
        self, client: AsyncClient, db_session: AsyncSession, make_user, queued_otp_email, queued_welcome_email
    ):
        user = await make_user(email="resend@example.com", email_verified=False)
        await OneTimePasswordService(db_session).create(user.id)
        await backdate(db_session, user.id, seconds=settings.otp_resend_cooldown_seconds + 1)

        response = await client.post("/api/v1/auth/otp/resend", json={"email": "resend@example.com"})

        assert response.status_code == 202
        assert response.json() == {"message": GENERIC_RESEND_MESSAGE}
        queued_otp_email.delay.assert_called_once()
        new_code = queued_otp_email.delay.call_args.args[2]

        verify_response = await client.post(
            "/api/v1/auth/otp/verify", json={"email": "resend@example.com", "code": new_code}
        )
        assert verify_response.status_code == 200

    async def test_retires_the_previous_code(
        self, client: AsyncClient, db_session: AsyncSession, make_user, queued_otp_email
    ):
        user = await make_user(email="resend2@example.com", email_verified=False)
        await OneTimePasswordService(db_session).create(user.id)
        old_otp = await get_code_row(db_session, user.id)
        old_otp_id = old_otp.id
        await backdate(db_session, user.id, seconds=settings.otp_resend_cooldown_seconds + 1)

        await client.post("/api/v1/auth/otp/resend", json={"email": "resend2@example.com"})

        codes = (
            await db_session.execute(select(OneTimePassword).where(OneTimePassword.user_id == user.id))
        ).scalars().all()
        assert len(codes) == 1
        assert codes[0].id != old_otp_id

    async def test_within_the_cooldown_sends_nothing(
        self, client: AsyncClient, db_session: AsyncSession, make_user, queued_otp_email
    ):
        user = await make_user(email="resend3@example.com", email_verified=False)
        await OneTimePasswordService(db_session).create(user.id)

        response = await client.post("/api/v1/auth/otp/resend", json={"email": "resend3@example.com"})

        assert response.status_code == 202
        assert response.json() == {"message": GENERIC_RESEND_MESSAGE}
        queued_otp_email.delay.assert_not_called()

    async def test_unknown_email_gets_the_same_response_and_nothing_is_sent(
        self, client: AsyncClient, queued_otp_email
    ):
        response = await client.post("/api/v1/auth/otp/resend", json={"email": "nobody@example.com"})

        assert response.status_code == 202
        assert response.json() == {"message": GENERIC_RESEND_MESSAGE}
        queued_otp_email.delay.assert_not_called()

    async def test_verified_user_gets_the_same_response_and_nothing_is_sent(
        self, client: AsyncClient, make_user, queued_otp_email
    ):
        await make_user(email="resend4@example.com")

        response = await client.post("/api/v1/auth/otp/resend", json={"email": "resend4@example.com"})

        assert response.status_code == 202
        assert response.json() == {"message": GENERIC_RESEND_MESSAGE}
        queued_otp_email.delay.assert_not_called()


class TestRegistrationFlow:
    async def test_register_verify_then_log_in(self, client: AsyncClient, mocker, queued_welcome_email):
        queued_register_email = mocker.patch("app.router.v1.user.task_send_otp_email")
        credentials = {"username": "flow@example.com", "password": "Str0ng!Pass"}

        register_response = await client.post(
            "/api/v1/user/register",
            json={
                "email": "flow@example.com",
                "password": "Str0ng!Pass",
                "confirm_password": "Str0ng!Pass",
            },
        )
        assert register_response.status_code == 201

        assert (await client.post("/api/v1/auth/login", data=credentials)).status_code == 403

        code = queued_register_email.delay.call_args.args[2]
        verify_response = await client.post(
            "/api/v1/auth/otp/verify", json={"email": "flow@example.com", "code": code}
        )
        assert verify_response.status_code == 200
        assert (await client.get("/api/v1/user/current")).status_code == 200

        client.cookies.clear()
        login_response = await client.post("/api/v1/auth/login", data=credentials)
        assert login_response.status_code == 200
        assert login_response.cookies.get("access_token") is not None
