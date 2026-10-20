from datetime import datetime, timezone

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.exceptions.user import UserAlreadyExists, UserIdDoesNotExist, UserEmailDoesNotExist, UserGoogleIdDoesNotExist
from app.models.user import User
from app.models.user_profile import UserProfile
from app.schema.user import UserCreate
from app.schema.user_profile import UserProfileCreate
from app.auth.password import hash_password
from app.utils.logging import Logger, LogLevel

class UserService:

    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_user_by_id(self, user_id: int) -> User:
        result = await self.session.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        if not user:
            raise UserIdDoesNotExist(user_id)
        return user

    async def get_user_by_email(self, email: str) -> User:
        result = await self.session.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        if not user:
            raise UserEmailDoesNotExist(email)
        return user

    async def get_user_by_google_id(self, google_id: str) -> User:
        result = await self.session.execute(select(User).where(User.google_id == google_id))
        user = result.scalars().first()
        if not user:
            Logger.log(LogLevel.ERROR, f"User with Google ID '{google_id}' does not exist.")
            raise UserGoogleIdDoesNotExist()
        return user

    async def create_user_with_password(self, user_create: UserCreate) -> User:
        email = user_create.email.strip().lower()
        hashed_password = hash_password(user_create.password)

        result = await self.session.execute(select(User).where(User.email == email))
        existing = result.scalars().first()
        if existing:
            Logger.log(LogLevel.ERROR, f"User with email '{email}' already exists.")
            raise UserAlreadyExists(email)

        user = User(
            email=email,
            password=hashed_password,
            profile=UserProfile(**UserProfileCreate().model_dump()),
            **user_create.model_dump(exclude={"email", "password", "confirm_password"})
        )

        self.session.add(user)
        await self.session.flush()

        return user

    async def delete_user(self, user: User) -> None:
        await self.session.delete(user)
        await self.session.flush()

    async def update_user_password(self, user: User, password: str) -> User:
        user.password = hash_password(password)
        user.password_updated_at = datetime.now(timezone.utc)

        self.session.add(user)
        await self.session.flush()

        return user

    async def link_google_id(self, user: User, google_id: str) -> User:
        user.google_id = google_id

        self.session.add(user)
        await self.session.flush()

        return user

    async def mark_email_verified(self, user: User) -> User:
        user.email_verified_at = datetime.now(timezone.utc)

        self.session.add(user)
        await self.session.flush()

        return user

    async def remove_password(self, user: User) -> User:
        user.password = None
        user.password_updated_at = datetime.now(timezone.utc)

        self.session.add(user)
        await self.session.flush()

        return user

    async def create_user_without_password(self, user_create: UserCreate) -> User:
        email = user_create.email.strip().lower()

        result = await self.session.execute(select(User).where(User.email == email))
        existing = result.scalars().first()
        if existing:
            raise UserAlreadyExists(email)

        user = User(
            email=email,
            profile=UserProfile(**UserProfileCreate().model_dump()),
            **user_create.model_dump(exclude={"email", "password", "confirm_password"})
        )

        self.session.add(user)
        await self.session.flush()

        return user

def get_user_service(session: AsyncSession = Depends(get_session)) -> UserService:
    return UserService(session)
