import logging
from fastapi import Cookie, Depends, HTTPException, status
from jose import JWTError

from app.exceptions.user import UserIdDoesNotExist
from app.models.user import User
from app.services.user_services import UserService, get_user_service
from app.auth.jwt import decode_access_token, is_token_issued_before_password_update

logger = logging.getLogger(__name__)

async def get_current_user_or_raise_http_error(access_token: str = Cookie(None), user_service: UserService = Depends(get_user_service)) -> User:
    """
    Accepts an access token from a cookie and returns a user.

    If the user cannot be fetched, throw a HTTP exception
    """
    if access_token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="You must be authorized to access.", headers={"WWW-Authenticate": "Bearer"})

    try:
        payload = decode_access_token(access_token)
    except JWTError as e:
        logger.info("Failed to decode access token: %s", e)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="You must be authorized to access.", headers={"WWW-Authenticate": "Bearer"})

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="You must be authorized to access.", headers={"WWW-Authenticate": "Bearer"})

    try:
        user = await user_service.get_user_by_id(int(user_id))
    except UserIdDoesNotExist as e:
        logger.warning("User ID %s from access token sub does not exist", user_id)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="You must be authorized to access.", headers={"WWW-Authenticate": "Bearer"})

    if is_token_issued_before_password_update(payload, user):
        logger.info("Access token for user ID %s was issued before their password was last updated", user_id)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="You must be authorized to access.", headers={"WWW-Authenticate": "Bearer"})

    return user

async def get_current_user_or_return_none(access_token: str = Cookie(None), user_service: UserService = Depends(get_user_service)) -> User | None:
    """
    Accepts an access token from a cookie and returns a user.

    If the user cannot be fetched, return None
    """

    if access_token is None:
        return None

    try:
        payload = decode_access_token(access_token)
    except JWTError as e:
        logger.info("Failed to decode access token: %s", e)
        return None

    user_id = payload.get("sub")
    if user_id is None:
        return None

    try:
        user = await user_service.get_user_by_id(int(user_id))
    except UserIdDoesNotExist as e:
        logger.warning("User ID %s from access token sub does not exist", user_id)
        return None

    if is_token_issued_before_password_update(payload, user):
        logger.info("Access token for user ID %s was issued before their password was last updated", user_id)
        return None

    return user
