import hashlib
from datetime import datetime, timedelta, timezone

import pytest

from app.core.config import settings
from app.exceptions.password_reset_token import (
    PasswordResetTokenDoesNotExist,
    PasswordResetTokenInvalid,
)
from app.models.password_reset_token import PasswordResetToken
from app.services.password_reset_token_services import PasswordResetTokenService
from tests.unit.mocks import make_mock_session


def make_token(
    created_at: datetime | None = None,
    used_at: datetime | None = None,
) -> PasswordResetToken:
    return PasswordResetToken(
        user_id=1,
        token_hash="a" * 64,
        created_at=created_at or datetime.now(timezone.utc),
        used_at=used_at,
    )


class TestCreate:
    async def test_returns_raw_token_and_persists_only_its_hash(self):
        # The whole point of the table: a database leak must not hand over
        # working reset links.
        session = make_mock_session()

        raw_token = await PasswordResetTokenService(session).create(user_id=1)

        persisted = session.add.call_args.args[0]
        assert persisted.token_hash == hashlib.sha256(raw_token.encode()).hexdigest()
        assert persisted.token_hash != raw_token
        assert persisted.user_id == 1

    async def test_flushes_so_the_row_lands_in_the_request_transaction(self):
        session = make_mock_session()

        await PasswordResetTokenService(session).create(user_id=1)

        session.add.assert_called_once()
        session.flush.assert_awaited_once()
        session.commit.assert_not_awaited()

    async def test_raw_token_is_unpredictable(self):
        session = make_mock_session()
        service = PasswordResetTokenService(session)

        tokens = {await service.create(user_id=1) for _ in range(10)}

        assert len(tokens) == 10

    async def test_hash_is_sha256_hex(self):
        session = make_mock_session()

        await PasswordResetTokenService(session).create(user_id=1)

        persisted = session.add.call_args.args[0]
        assert len(persisted.token_hash) == 64
        assert int(persisted.token_hash, 16) >= 0


class TestGetByRawToken:
    async def test_returns_token_when_found_and_valid(self):
        token = make_token()
        session = make_mock_session(first_return=token)

        result = await PasswordResetTokenService(session).get_by_raw_token("raw")

        assert result is token

    async def test_raises_when_no_token_matches(self):
        session = make_mock_session(first_return=None)

        with pytest.raises(PasswordResetTokenDoesNotExist):
            await PasswordResetTokenService(session).get_by_raw_token("raw")

    async def test_raises_when_token_has_expired(self):
        expired = make_token(created_at=datetime.now(timezone.utc) - timedelta(hours=1))
        session = make_mock_session(first_return=expired)

        with pytest.raises(PasswordResetTokenInvalid):
            await PasswordResetTokenService(session).get_by_raw_token("raw")

    async def test_raises_when_token_already_used(self):
        used = make_token(used_at=datetime.now(timezone.utc))
        session = make_mock_session(first_return=used)

        with pytest.raises(PasswordResetTokenInvalid):
            await PasswordResetTokenService(session).get_by_raw_token("raw")


class TestMarkAsUsed:
    async def test_stamps_used_at_and_invalidates_the_token(self):
        token = make_token()
        session = make_mock_session()

        result = await PasswordResetTokenService(session).mark_as_used(token)

        assert result.used_at is not None
        assert result.is_used is True
        assert result.is_valid is False
        session.flush.assert_awaited_once()


class TestGetResetUrl:
    def test_carries_the_token_in_the_fragment(self):
        # A fragment never reaches a server, so the token stays out of proxy
        # access logs and the referer header.
        service = PasswordResetTokenService(make_mock_session())

        url = service.get_reset_url("raw-token")

        assert url == f"{settings.frontend_url}/password-reset#token=raw-token"
        assert "?" not in url
