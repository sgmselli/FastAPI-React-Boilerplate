from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime, timezone

from app.db.base_class import Base

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password = Column(String(200), nullable=True)
    name = Column(String(200), nullable=False)
    google_id = Column(String(200), unique=True, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)

