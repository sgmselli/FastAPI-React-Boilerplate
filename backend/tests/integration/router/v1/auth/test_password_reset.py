from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from jose import jwt as jose_jwt

from app.auth.password import verify_password
from app.core.config import settings
from app.models.password_reset_token import PasswordResetToken
from app.services.user_services import get_user_by_email

REQUEST_URL = "/api/v1/auth/password-reset/request"
VALIDATE_URL = "/api/v1/auth/password-reset/validate"
CONFIRM_URL = "/api/v1/auth/password-reset/confirm"

NEW_PASSWORD = "N3w!Password"


@pytest.fixture
def queued_email(mocker):
    """
    Stands in for the Celery task so nothing tries to reach Redis, and so the
    raw token - which is never stored or returned - can be read back out of
    the link the worker would have been handed.
    """
    return mocker.patch(
        "app.router.v1.auth.password_reset.task_send_password_reset_email"
    )


def existing_session_token(user_id: int, minutes_ago: int) -> str:
    """
    An access token that was issued in the past, the way a session someone is
    already holding would have been - create_access_token can only stamp iat
    with the current second.
    """
    issued_at = datetime.now(timezone.utc) - timedelta(minutes=minutes_ago)
    return jose_jwt.encode(
        {
            "sub": str(user_id),
            "iat": issued_at,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=30),
        },
        settings.access_secret_key,
        algorithm=settings.jwt_encryption_algorithm,
    )


def emailed_token(queued_email) -> str:
    reset_url = queued_email.delay.call_args.args[2]
    return reset_url.split("#token=")[1]


@pytest_asyncio.fixture
async def user_with_token(client: AsyncClient, make_user, queued_email):
    """A real user who has requested a reset, plus their raw token."""
    user = await make_user(email="reset@example.com")
    await client.post(REQUEST_URL, json={"email": "reset@example.com"})
    return user, emailed_token(queued_email)


class TestRequest:
    async def test_known_email_returns_202_and_queues_the_email(
        self, client: AsyncClient, make_user, queued_email
    ):
        await make_user(email="known@example.com")

        response = await client.post(REQUEST_URL, json={"email": "known@example.com"})

        assert response.status_code == 202
        queued_email.delay.assert_called_once()
        assert queued_email.delay.call_args.args[0] == "known@example.com"

    async def test_unknown_email_is_indistinguishable_from_a_known_one(
        self, client: AsyncClient, make_user, queued_email
    ):
        # The generic response is the only thing stopping this endpoint from
        # being an account enumeration oracle.
        await make_user(email="real@example.com")

        known = await client.post(REQUEST_URL, json={"email": "real@example.com"})
        unknown = await client.post(REQUEST_URL, json={"email": "ghost@example.com"})

        assert known.status_code == unknown.status_code == 202
        assert known.json() == unknown.json()

    async def test_unknown_email_sends_nothing_and_stores_nothing(
        self, client: AsyncClient, db_session: AsyncSession, queued_email
    ):
        await client.post(REQUEST_URL, json={"email": "ghost@example.com"})

        queued_email.delay.assert_not_called()
        tokens = (await db_session.execute(select(PasswordResetToken))).scalars().all()
        assert tokens == []

    async def test_persists_only_the_hash_of_the_emailed_token(
        self, client: AsyncClient, db_session: AsyncSession, make_user, queued_email
    ):
        await make_user(email="hash@example.com")

        await client.post(REQUEST_URL, json={"email": "hash@example.com"})

        raw_token = emailed_token(queued_email)
        tokens = (await db_session.execute(select(PasswordResetToken))).scalars().all()
        assert len(tokens) == 1
        assert tokens[0].token_hash != raw_token

    async def test_email_is_normalised_before_lookup(
        self, client: AsyncClient, make_user, queued_email
    ):
        await make_user(email="case@example.com")

        response = await client.post(REQUEST_URL, json={"email": "  CASE@Example.com "})

        assert response.status_code == 202
        queued_email.delay.assert_called_once()

    async def test_reset_link_carries_the_token_in_the_fragment(
        self, client: AsyncClient, make_user, queued_email
    ):
        await make_user(email="frag@example.com")

        await client.post(REQUEST_URL, json={"email": "frag@example.com"})

        reset_url = queued_email.delay.call_args.args[2]
        assert "#token=" in reset_url
        assert "?token=" not in reset_url


class TestValidate:
    async def test_unused_token_is_valid(self, client: AsyncClient, user_with_token):
        _, raw_token = user_with_token

        response = await client.post(VALIDATE_URL, json={"token": raw_token})

        assert response.status_code == 200
        assert response.json() == {"valid": True}

    async def test_unknown_token_is_invalid_without_erroring(self, client: AsyncClient):
        response = await client.post(VALIDATE_URL, json={"token": "never-issued"})

        assert response.status_code == 200
        assert response.json() == {"valid": False}

    async def test_token_is_invalid_once_redeemed(
        self, client: AsyncClient, user_with_token
    ):
        _, raw_token = user_with_token
        await client.post(
            CONFIRM_URL,
            json={
                "token": raw_token,
                "password": NEW_PASSWORD,
                "confirm_password": NEW_PASSWORD,
            },
        )

        response = await client.post(VALIDATE_URL, json={"token": raw_token})

        assert response.json() == {"valid": False}

    async def test_expired_token_is_invalid(
        self, client: AsyncClient, db_session: AsyncSession, user_with_token
    ):
        _, raw_token = user_with_token
        token = (await db_session.execute(select(PasswordResetToken))).scalars().one()
        token.created_at = datetime.now(timezone.utc) - timedelta(hours=1)
        await db_session.flush()

        response = await client.post(VALIDATE_URL, json={"token": raw_token})

        assert response.json() == {"valid": False}


class TestConfirm:
    async def test_valid_token_changes_the_password(
        self, client: AsyncClient, db_session: AsyncSession, user_with_token
    ):
        _, raw_token = user_with_token

        response = await client.post(
            CONFIRM_URL,
            json={
                "token": raw_token,
                "password": NEW_PASSWORD,
                "confirm_password": NEW_PASSWORD,
            },
        )

        assert response.status_code == 200
        user = await get_user_by_email("reset@example.com", db_session)
        assert verify_password(NEW_PASSWORD, user.password)

    async def test_marks_the_token_as_used(
        self, client: AsyncClient, db_session: AsyncSession, user_with_token
    ):
        _, raw_token = user_with_token

        await client.post(
            CONFIRM_URL,
            json={
                "token": raw_token,
                "password": NEW_PASSWORD,
                "confirm_password": NEW_PASSWORD,
            },
        )

        token = (await db_session.execute(select(PasswordResetToken))).scalars().one()
        assert token.is_used is True

    async def test_token_cannot_be_redeemed_twice(
        self, client: AsyncClient, user_with_token
    ):
        # A reset link reaching a second pair of hands - a forwarded email, a
        # shared inbox - must be worthless once spent.
        _, raw_token = user_with_token
        body = {
            "token": raw_token,
            "password": NEW_PASSWORD,
            "confirm_password": NEW_PASSWORD,
        }
        await client.post(CONFIRM_URL, json=body)

        second = await client.post(CONFIRM_URL, json=body)

        assert second.status_code == 400

    async def test_unknown_token_returns_400(self, client: AsyncClient):
        response = await client.post(
            CONFIRM_URL,
            json={
                "token": "never-issued",
                "password": NEW_PASSWORD,
                "confirm_password": NEW_PASSWORD,
            },
        )

        assert response.status_code == 400

    async def test_expired_token_returns_400_and_leaves_password_alone(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        user_with_token,
        shared_password: str,
    ):
        _, raw_token = user_with_token
        token = (await db_session.execute(select(PasswordResetToken))).scalars().one()
        token.created_at = datetime.now(timezone.utc) - timedelta(hours=1)
        await db_session.flush()

        response = await client.post(
            CONFIRM_URL,
            json={
                "token": raw_token,
                "password": NEW_PASSWORD,
                "confirm_password": NEW_PASSWORD,
            },
        )

        assert response.status_code == 400
        user = await get_user_by_email("reset@example.com", db_session)
        assert verify_password(shared_password, user.password)

    async def test_unknown_and_expired_tokens_share_a_message(
        self, client: AsyncClient, db_session: AsyncSession, user_with_token
    ):
        _, raw_token = user_with_token
        token = (await db_session.execute(select(PasswordResetToken))).scalars().one()
        token.created_at = datetime.now(timezone.utc) - timedelta(hours=1)
        await db_session.flush()

        expired = await client.post(
            CONFIRM_URL,
            json={
                "token": raw_token,
                "password": NEW_PASSWORD,
                "confirm_password": NEW_PASSWORD,
            },
        )
        unknown = await client.post(
            CONFIRM_URL,
            json={
                "token": "never-issued",
                "password": NEW_PASSWORD,
                "confirm_password": NEW_PASSWORD,
            },
        )

        assert expired.json() == unknown.json()

    async def test_mismatched_confirmation_returns_422(
        self, client: AsyncClient, user_with_token
    ):
        _, raw_token = user_with_token

        response = await client.post(
            CONFIRM_URL,
            json={
                "token": raw_token,
                "password": NEW_PASSWORD,
                "confirm_password": "Different1!",
            },
        )

        assert response.status_code == 422

    async def test_weak_password_returns_422(self, client: AsyncClient, user_with_token):
        _, raw_token = user_with_token

        response = await client.post(
            CONFIRM_URL,
            json={"token": raw_token, "password": "weak", "confirm_password": "weak"},
        )

        assert response.status_code == 422

    async def test_advances_password_updated_at(
        self, client: AsyncClient, db_session: AsyncSession, user_with_token
    ):
        user, raw_token = user_with_token
        before = user.password_updated_at

        await client.post(
            CONFIRM_URL,
            json={
                "token": raw_token,
                "password": NEW_PASSWORD,
                "confirm_password": NEW_PASSWORD,
            },
        )

        refreshed = await get_user_by_email("reset@example.com", db_session)
        assert refreshed.password_updated_at > before


class TestSessionsAreRevoked:
    async def test_access_token_issued_before_the_reset_stops_working(
        self, client: AsyncClient, db_session: AsyncSession, user_with_token
    ):
        # The reason password_updated_at exists: resetting must evict a
        # session someone else is already holding.
        #
        # The session is deliberately dated half an hour back rather than
        # minted here. iat is whole seconds, so a token created in this same
        # second would floor to the same value as the reset and survive it -
        # the one second window the comparison accepts by design.
        user, raw_token = user_with_token
        user.password_updated_at = datetime.now(timezone.utc) - timedelta(hours=1)
        await db_session.flush()

        stolen = existing_session_token(user.id, minutes_ago=30)
        assert (
            await client.get("/api/v1/user/current", cookies={"access_token": stolen})
        ).status_code == 200

        await client.post(
            CONFIRM_URL,
            json={
                "token": raw_token,
                "password": NEW_PASSWORD,
                "confirm_password": NEW_PASSWORD,
            },
        )

        after = await client.get(
            "/api/v1/user/current", cookies={"access_token": stolen}
        )
        assert after.status_code == 401
