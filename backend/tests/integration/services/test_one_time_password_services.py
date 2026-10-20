import hashlib
import hmac
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.exceptions.one_time_password import (
    OneTimePasswordDoesNotExist,
    OneTimePasswordIncorrect,
    OneTimePasswordInvalid,
)
from app.models.one_time_password import OneTimePassword
from app.services.one_time_password_services import OneTimePasswordService


def _wrong_code(raw_code: str) -> str:
    return "000000" if raw_code != "000000" else "111111"


class TestCreate:
    async def test_persists_a_row_holding_only_the_keyed_hash(
        self, db_session: AsyncSession, make_user
    ):
        user = await make_user(email="otp@example.com")
        service = OneTimePasswordService(db_session)

        raw_code = await service.create(user.id)

        stored = (await db_session.execute(select(OneTimePassword))).scalars().one()
        assert stored.user_id == user.id
        assert stored.code_hash == hmac.new(
            settings.otp_secret_key.encode(), raw_code.encode(), hashlib.sha256
        ).hexdigest()
        assert stored.attempts == 0
        assert stored.used_at is None

    async def test_code_is_six_digits(self, db_session: AsyncSession, make_user):
        user = await make_user(email="otp2@example.com")

        raw_code = await OneTimePasswordService(db_session).create(user.id)

        assert len(raw_code) == 6
        assert raw_code.isdigit()

    async def test_retires_the_users_previous_codes(
        self, db_session: AsyncSession, make_user
    ):
        user = await make_user(email="otp3@example.com")
        service = OneTimePasswordService(db_session)
        await service.create(user.id)
        first_id = (await service.get_otp_by_user_id(user.id)).id

        await service.create(user.id)

        rows = (await db_session.execute(select(OneTimePassword))).scalars().all()
        assert len(rows) == 1
        assert rows[0].id != first_id

    async def test_leaves_other_users_codes_alone(
        self, db_session: AsyncSession, make_user
    ):
        alice = await make_user(email="otp-alice@example.com")
        bob = await make_user(email="otp-bob@example.com")
        service = OneTimePasswordService(db_session)
        alice_code = await service.create(alice.id)

        await service.create(bob.id)

        assert (await service.verify(alice.id, alice_code)).is_used


class TestDeleteOtpByUserId:
    async def test_removes_the_users_code(self, db_session: AsyncSession, make_user):
        user = await make_user(email="otp-delete@example.com")
        service = OneTimePasswordService(db_session)
        await service.create(user.id)

        await service.delete_otp_by_user_id(user.id)

        with pytest.raises(OneTimePasswordDoesNotExist):
            await service.get_otp_by_user_id(user.id)

    async def test_leaves_other_users_codes_alone(
        self, db_session: AsyncSession, make_user
    ):
        alice = await make_user(email="otp-delete-alice@example.com")
        bob = await make_user(email="otp-delete-bob@example.com")
        service = OneTimePasswordService(db_session)
        await service.create(alice.id)
        await service.create(bob.id)

        await service.delete_otp_by_user_id(bob.id)

        assert (await service.get_otp_by_user_id(alice.id)).user_id == alice.id

    async def test_is_a_no_op_when_the_user_has_no_code(
        self, db_session: AsyncSession, make_user
    ):
        user = await make_user(email="otp-delete-none@example.com")

        await OneTimePasswordService(db_session).delete_otp_by_user_id(user.id)


class TestVerify:
    async def test_marks_the_code_used_on_success(
        self, db_session: AsyncSession, make_user
    ):
        user = await make_user(email="otp4@example.com")
        service = OneTimePasswordService(db_session)
        raw_code = await service.create(user.id)

        verified = await service.verify(user.id, raw_code)

        assert verified.used_at is not None

    async def test_raises_for_a_code_that_was_never_issued(
        self, db_session: AsyncSession, make_user
    ):
        user = await make_user(email="otp5@example.com")

        with pytest.raises(OneTimePasswordDoesNotExist):
            await OneTimePasswordService(db_session).verify(user.id, "123456")

    async def test_wrong_code_counts_an_attempt(
        self, db_session: AsyncSession, make_user
    ):
        user = await make_user(email="otp6@example.com")
        service = OneTimePasswordService(db_session)
        raw_code = await service.create(user.id)

        with pytest.raises(OneTimePasswordIncorrect):
            await service.verify(user.id, _wrong_code(raw_code))

        stored = (await db_session.execute(select(OneTimePassword))).scalars().one()
        assert stored.attempts == 1
        assert stored.used_at is None

    async def test_attempt_survives_a_request_rollback(
        self, db_session: AsyncSession, make_user
    ):
        # The router raises after a wrong code, and get_session rolls the
        # request back on any exception - the attempt has to outlive that or
        # the attempt limit never trips.
        user = await make_user(email="otp7@example.com")
        service = OneTimePasswordService(db_session)
        raw_code = await service.create(user.id)

        with pytest.raises(OneTimePasswordIncorrect):
            await service.verify(user.id, _wrong_code(raw_code))
        await db_session.rollback()

        stored = (await db_session.execute(select(OneTimePassword))).scalars().one()
        assert stored.attempts == 1

    async def test_locks_out_after_max_attempts_even_with_the_right_code(
        self, db_session: AsyncSession, make_user
    ):
        user = await make_user(email="otp8@example.com")
        service = OneTimePasswordService(db_session)
        raw_code = await service.create(user.id)

        for _ in range(settings.otp_max_attempts):
            with pytest.raises(OneTimePasswordIncorrect):
                await service.verify(user.id, _wrong_code(raw_code))

        with pytest.raises(OneTimePasswordInvalid):
            await service.verify(user.id, raw_code)

    async def test_raises_once_expired(self, db_session: AsyncSession, make_user):
        user = await make_user(email="otp9@example.com")
        service = OneTimePasswordService(db_session)
        raw_code = await service.create(user.id)

        otp = await service.get_otp_by_user_id(user.id)
        otp.created_at = datetime.now(timezone.utc) - timedelta(minutes=settings.otp_expire_minutes + 1)
        await db_session.flush()

        with pytest.raises(OneTimePasswordInvalid):
            await service.verify(user.id, raw_code)

    async def test_raises_once_used(self, db_session: AsyncSession, make_user):
        user = await make_user(email="otp10@example.com")
        service = OneTimePasswordService(db_session)
        raw_code = await service.create(user.id)
        await service.verify(user.id, raw_code)

        with pytest.raises(OneTimePasswordInvalid):
            await service.verify(user.id, raw_code)


class TestCanResend:
    async def test_true_when_no_code_has_been_issued(
        self, db_session: AsyncSession, make_user
    ):
        user = await make_user(email="otp11@example.com")

        assert await OneTimePasswordService(db_session).can_resend(user.id)

    async def test_false_within_the_cooldown(
        self, db_session: AsyncSession, make_user
    ):
        user = await make_user(email="otp12@example.com")
        service = OneTimePasswordService(db_session)
        await service.create(user.id)

        assert not await service.can_resend(user.id)

    async def test_true_once_the_cooldown_has_passed(
        self, db_session: AsyncSession, make_user
    ):
        user = await make_user(email="otp13@example.com")
        service = OneTimePasswordService(db_session)
        await service.create(user.id)

        otp = await service.get_otp_by_user_id(user.id)
        otp.created_at = datetime.now(timezone.utc) - timedelta(seconds=settings.otp_resend_cooldown_seconds + 1)
        await db_session.flush()

        assert await service.can_resend(user.id)


class TestCascadeDelete:
    async def test_codes_go_with_the_user(self, db_session: AsyncSession, make_user):
        user = await make_user(email="otp14@example.com")
        await OneTimePasswordService(db_session).create(user.id)

        await db_session.delete(user)
        await db_session.flush()

        codes = (await db_session.execute(select(OneTimePassword))).scalars().all()
        assert codes == []
