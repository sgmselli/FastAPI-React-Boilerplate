from typing import Any
from fastapi import Response
from jose import jwt
from datetime import datetime, timedelta, timezone

from app.core.config import settings

def create_access_token(data: dict[Any, Any]) -> str:
    data_to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    data_to_encode.update({"exp": expire})
    return jwt.encode(data_to_encode, settings.access_secret_key, algorithm=settings.jwt_encryption_algorithm)

def create_refresh_token(data: dict[Any, Any]) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.refresh_secret_key, algorithm=settings.jwt_encryption_algorithm)

def decode_access_token(token: str) ->  dict[str, Any]:
    return jwt.decode(token, settings.access_secret_key, algorithms=[settings.jwt_encryption_algorithm])

def decode_refresh_token(token: str) -> dict[str, Any]:
    return jwt.decode(token, settings.refresh_secret_key, algorithms=[settings.jwt_encryption_algorithm])

def store_tokens(response: Response, access_token: str, refresh_token: str) -> None:
    store_access_token(response, access_token)
    store_refresh_token(response, refresh_token)

def store_access_token(response: Response, access_token: str) -> None:
    expire_time_from_minutes_to_seconds = 60 * settings.access_token_expire_minutes
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=not settings.debug,
        samesite='lax',
        max_age=expire_time_from_minutes_to_seconds
    )

def store_refresh_token(response: Response, refresh_token: str) -> None:
    expire_time_from_days_to_seconds = 60 * 60 * 24 * settings.refresh_token_expire_days
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=not settings.debug,
        samesite='lax',
        max_age=expire_time_from_days_to_seconds
    )

def delete_tokens(response: Response) -> None:
    delete_access_token(response)
    delete_refresh_token(response)

def delete_access_token(response: Response) -> None:
    response.delete_cookie(
        key="access_token",
        httponly=True,
        secure=False,
        samesite="lax",
        path="/"
    )

def delete_refresh_token(response: Response) -> None:
    response.delete_cookie(
        key="refresh_token",
        httponly=True,
        secure=False,
        samesite="lax",
        path="/"
    )


