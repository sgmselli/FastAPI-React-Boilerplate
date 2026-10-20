from datetime import datetime, timedelta, timezone
import hashlib
import hmac
import secrets

from fastapi import Depends
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_session
from app.exceptions.one_time_password import (
    OneTimePasswordDoesNotExist,
    OneTimePasswordIncorrect,
    OneTimePasswordInvalid,
)
from app.models.one_time_password import OneTimePassword
from app.schema.one_time_password import OneTimePasswordCreate

class OneTimePasswordService:

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, user_id: int) -> str:
        # Only the newest code is ever live - issuing one retires the rest.
        await self.delete_otp_by_user_id(user_id)

        raw_code = self._generate_raw_code()

        otp_create = OneTimePasswordCreate(
            user_id=user_id,
            code_hash=self._hash_code(raw_code)
        )
        otp = OneTimePassword(**otp_create.model_dump())

        self.session.add(otp)
        await self.session.flush()

        return raw_code

    async def get_otp_by_user_id(self, user_id: int) -> OneTimePassword:
        result = await self.session.execute(select(OneTimePassword).where(OneTimePassword.user_id == user_id))
        otp = result.scalars().first()
        if not otp:
            raise OneTimePasswordDoesNotExist()
        return otp

    async def delete_otp_by_user_id(self, user_id: int) -> None:
        await self.session.execute(delete(OneTimePassword).where(OneTimePassword.user_id == user_id))
        await self.session.flush()

    async def verify(self, user_id: int, raw_code: str) -> OneTimePassword:
        result = await self.session.execute(
            select(OneTimePassword)
            .where(OneTimePassword.user_id == user_id)
            .with_for_update()
        )
        otp = result.scalars().first()
        if not otp:
            raise OneTimePasswordDoesNotExist()
        if not otp.is_valid:
            raise OneTimePasswordInvalid()

        if not hmac.compare_digest(otp.code_hash, self._hash_code(raw_code)):
            otp.attempts += 1
            self.session.add(otp)
            # Committed here rather than left to get_session: the caller is
            # about to raise, which rolls the request back and would otherwise
            # undo the attempt - leaving the code open to brute force.
            await self.session.commit()
            raise OneTimePasswordIncorrect()

        otp.used_at = datetime.now(timezone.utc)

        self.session.add(otp)
        await self.session.flush()

        return otp

    async def can_resend(self, user_id: int) -> bool:
        try:
            otp = await self.get_otp_by_user_id(user_id)
        except OneTimePasswordDoesNotExist:
            return True

        cooldown_cutoff = otp.created_at + timedelta(seconds=settings.otp_resend_cooldown_seconds)
        return datetime.now(timezone.utc) >= cooldown_cutoff

    def _generate_raw_code(self) -> str:
        if settings.otp_fixed_code:
            return settings.otp_fixed_code

        CODE_DIGITS = 6
        return f"{secrets.randbelow(10 ** CODE_DIGITS):0{CODE_DIGITS}d}"

    def _hash_code(self, raw_code: str) -> str:
        # Keyed rather than a plain sha256 like the reset tokens: there are only
        # a million codes, so an unkeyed hash is reversible by brute force.
        return hmac.new(settings.otp_secret_key.encode(), raw_code.encode(), hashlib.sha256).hexdigest()

def get_one_time_password_service(session: AsyncSession = Depends(get_session)) -> OneTimePasswordService:
    return OneTimePasswordService(session)
