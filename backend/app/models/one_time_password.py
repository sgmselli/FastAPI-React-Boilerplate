from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.db.base_class import Base

class OneTimePassword(Base):
    __tablename__ = 'one_time_passwords'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    code_hash = Column(String(64), nullable=False)
    attempts = Column(Integer, default=0, nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

    @property
    def is_used(self) -> bool:
        return self.used_at is not None

    @property
    def is_expired(self) -> bool:
        expiry_cutoff = self.created_at + timedelta(minutes=settings.otp_expire_minutes)
        return datetime.now(timezone.utc) >= expiry_cutoff

    @property
    def is_attempts_exceeded(self) -> bool:
        return self.attempts >= settings.otp_max_attempts

    @property
    def is_valid(self) -> bool:
        return not self.is_used and not self.is_expired and not self.is_attempts_exceeded
