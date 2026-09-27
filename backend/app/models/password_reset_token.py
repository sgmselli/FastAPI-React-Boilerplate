from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime, timedelta, timezone

from app.db.base_class import Base

class PasswordResetToken(Base):
    __tablename__ = 'password_reset_tokens'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    token_hash = Column(String(64), unique=True, nullable=False, index=True)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    @property
    def is_used(self) -> bool:
        return self.used_at is not None

    @property
    def is_valid(self) -> bool:
        TOKEN_VALIDITY_MINUTES = 15
        expiry_cutoff = self.created_at + timedelta(minutes=TOKEN_VALIDITY_MINUTES)
        return not self.is_used and datetime.now(timezone.utc) < expiry_cutoff
