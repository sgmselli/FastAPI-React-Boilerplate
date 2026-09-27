import hashlib
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.password_reset_token import (
    PasswordResetTokenDoesNotExist,
    PasswordResetTokenInvalid,
)
from app.models.password_reset_token import PasswordResetToken
from app.services.password_reset_token_services import PasswordResetTokenService


class TestCreate:
    async def test_persists_a_row_holding_only_the_hash(
        self, db_session: AsyncSession, make_user
    ):
        user = await make_user(email="svc@example.com")
        service = PasswordResetTokenService(db_session)

        raw_token = await service.create(user.id)

        token = (await db_session.execute(select(PasswordResetToken))).scalars().one()
        assert token.user_id == user.id
        assert token.token_hash == hashlib.sha256(raw_token.encode()).hexdigest()
        assert token.used_at is None

    async def test_row_is_readable_before_the_request_commits(
        self, db_session: AsyncSession, make_user
    ):
        # create() only flushes now - get_session owns the commit - so the row
        # has to be visible within the same transaction.
        user = await make_user(email="svc2@example.com")
        service = PasswordResetTokenService(db_session)

        raw_token = await service.create(user.id)

        assert await service.get_by_raw_token(raw_token) is not None


class TestGetByRawToken:
    async def test_round_trips_a_freshly_created_token(
        self, db_session: AsyncSession, make_user
    ):
        user = await make_user(email="svc3@example.com")
        service = PasswordResetTokenService(db_session)
        raw_token = await service.create(user.id)

        token = await service.get_by_raw_token(raw_token)

        assert token.user_id == user.id

    async def test_raises_for_a_token_that_was_never_issued(
        self, db_session: AsyncSession
    ):
        with pytest.raises(PasswordResetTokenDoesNotExist):
            await PasswordResetTokenService(db_session).get_by_raw_token("nope")

    async def test_raises_once_expired(self, db_session: AsyncSession, make_user):
        user = await make_user(email="svc4@example.com")
        service = PasswordResetTokenService(db_session)
        raw_token = await service.create(user.id)

        token = (await db_session.execute(select(PasswordResetToken))).scalars().one()
        token.created_at = datetime.now(timezone.utc) - timedelta(minutes=16)
        await db_session.flush()

        with pytest.raises(PasswordResetTokenInvalid):
            await service.get_by_raw_token(raw_token)

    async def test_raises_once_used(self, db_session: AsyncSession, make_user):
        user = await make_user(email="svc5@example.com")
        service = PasswordResetTokenService(db_session)
        raw_token = await service.create(user.id)
        await service.mark_as_used(await service.get_by_raw_token(raw_token))

        with pytest.raises(PasswordResetTokenInvalid):
            await service.get_by_raw_token(raw_token)


class TestMarkAsUsed:
    async def test_persists_used_at(self, db_session: AsyncSession, make_user):
        user = await make_user(email="svc6@example.com")
        service = PasswordResetTokenService(db_session)
        raw_token = await service.create(user.id)

        await service.mark_as_used(await service.get_by_raw_token(raw_token))

        token = (await db_session.execute(select(PasswordResetToken))).scalars().one()
        assert token.used_at is not None


class TestCascadeDelete:
    async def test_tokens_go_with_the_user(
        self, db_session: AsyncSession, make_user
    ):
        # ondelete=CASCADE on the FK - deleting a user must not strand live
        # reset tokens pointing at a row that no longer exists.
        user = await make_user(email="svc7@example.com")
        await PasswordResetTokenService(db_session).create(user.id)

        await db_session.delete(user)
        await db_session.flush()

        tokens = (await db_session.execute(select(PasswordResetToken))).scalars().all()
        assert tokens == []