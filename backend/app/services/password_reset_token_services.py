from datetime import datetime, timezone
import hashlib
import secrets

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_session
from app.exceptions.password_reset_token import PasswordResetTokenDoesNotExist, PasswordResetTokenInvalid
from app.models.password_reset_token import PasswordResetToken
from app.schema.password_reset_token import PasswordResetTokenCreate

class PasswordResetTokenService:

    def __init__(self, session: AsyncSession):
        self.session = session

    async def create(self, user_id: int) -> str:
        raw_token = self._generate_raw_token()

        token_create = PasswordResetTokenCreate(
            user_id=user_id,
            token_hash=self._hash_reset_token(raw_token)
        )
        token = PasswordResetToken(**token_create.model_dump())

        self.session.add(token)
        await self.session.flush()

        return raw_token

    async def get_by_raw_token(self, raw_token: str) -> PasswordResetToken:
        token_hash = self._hash_reset_token(raw_token)

        result = await self.session.execute(select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash))
        token = result.scalars().first()
        if not token:
            raise PasswordResetTokenDoesNotExist()
        if not token.is_valid:
            raise PasswordResetTokenInvalid()
        return token

    def get_reset_url(self, raw_token: str) -> str:
        return f"{settings.frontend_url}/password-reset#token={raw_token}"

    async def mark_as_used(self, token: PasswordResetToken) -> PasswordResetToken:
        token.used_at = datetime.now(timezone.utc)

        self.session.add(token)
        await self.session.flush()

        return token

    def _generate_raw_token(self) -> str:
            TOKEN_BYTES = 32
            return secrets.token_urlsafe(TOKEN_BYTES)
    
    def _hash_reset_token(self, raw_token: str) -> str:
        return hashlib.sha256(raw_token.encode()).hexdigest()

def get_password_reset_token_service(session: AsyncSession = Depends(get_session)) -> PasswordResetTokenService:
    return PasswordResetTokenService(session)
