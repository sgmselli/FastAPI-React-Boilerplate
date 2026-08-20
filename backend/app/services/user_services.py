from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.exceptions.user import UserAlreadyExists, UserIdDoesNotExist, UserEmailDoesNotExist, UserGoogleIdDoesNotExist
from app.models.user import User
from app.schema.user import UserCreate
from app.auth.password import hash_password
from app.utils.logging import Logger, LogLevel

async def get_user_by_id(user_id: int, session: AsyncSession) -> User:
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise UserIdDoesNotExist(user_id)
    return user

async def get_user_by_email(email: str, session: AsyncSession) -> User:
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalars().first()
    if not user:
        raise UserEmailDoesNotExist(email)
    return user

async def get_user_by_google_id(google_id: str, session: AsyncSession) -> User:
    result = await session.execute(select(User).where(User.google_id == google_id))
    user = result.scalars().first()
    if not user:
        Logger.log(LogLevel.ERROR, f"User with Google ID '{google_id}' does not exist.")
        raise UserGoogleIdDoesNotExist()
    return user

async def create_user_with_password(user_create: UserCreate, session: AsyncSession) -> User:
    email = user_create.email.strip().lower()
    hashed_password = hash_password(user_create.password)

    result = await session.execute(select(User).where(User.email == email))
    existing = result.scalars().first()
    if existing:
        Logger.log(LogLevel.ERROR, f"User with email '{email}' already exists.")
        raise UserAlreadyExists(email)

    user = User(
        email=email,
        password=hashed_password,
        **user_create.model_dump(exclude={"email", "password", "confirm_password"})
    )

    session.add(user)
    await session.commit()
    await session.refresh(user)

    return user

async def create_user_without_password(user_create: UserCreate, session: AsyncSession) -> User:
    email = user_create.email.strip().lower()

    result = await session.execute(select(User).where(User.email == email))
    existing = result.scalars().first()
    if existing:
        raise UserAlreadyExists(email)

    user = User(
        email=email,
        **user_create.model_dump(exclude={"email", "password", "confirm_password"})
    )

    session.add(user)
    await session.commit()
    await session.refresh(user)

    return user