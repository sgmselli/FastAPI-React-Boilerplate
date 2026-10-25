import logging
from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, status
from fastapi.security import OAuth2PasswordRequestForm
from uuid import uuid4

from jose import JWTError

from app.exceptions.user import UserEmailDoesNotExist, UserIdDoesNotExist
from app.schema.user import UserResponse
from app.services.user_services import UserService, get_user_service
from app.auth.jwt import create_access_token, create_refresh_token, store_tokens, decode_refresh_token, \
    store_access_token, delete_tokens, is_token_issued_before_password_update
from app.auth.password import verify_password

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post('/login', response_model=UserResponse, status_code=status.HTTP_200_OK)
async def login(
    response: Response,
    user_service: UserService = Depends(get_user_service),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    email = form_data.username
    password = form_data.password

    try:
        user = await user_service.get_user_by_email(email)
    except UserEmailDoesNotExist:
        logger.info("Login attempted for an email which does not exist")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password.")

    if user.password is None or not verify_password(password, user.password):
        logger.info("Incorrect password entered for user ID %s", user.id)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password.")

    if not user.is_email_verified:
        logger.info("User ID %s tried to log in before verifying their email", user.id)
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Please verify your email.")

    access_token = create_access_token({
        "sub": str(user.id)
    })
    refresh_token = create_refresh_token({
        "sub": str(user.id),
        "jti": str(uuid4())
    })
    store_tokens(response, access_token, refresh_token)
    response.status_code = 200
    return UserResponse.model_validate(user)

@router.post('/refresh', status_code=status.HTTP_200_OK)
async def refresh_auth_tokens(
    response: Response,
    refresh_token: str = Cookie(None),
    user_service: UserService = Depends(get_user_service)
):
    if refresh_token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="You must be authorized to access.", headers={"WWW-Authenticate": "Bearer"})

    try:
        decoded = decode_refresh_token(refresh_token)
    except JWTError as e:
        logger.info("Failed to decode refresh token: %s", e)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="You must be authorized to access.", headers={"WWW-Authenticate": "Bearer"})

    sub = decoded.get("sub")
    if sub is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="You must be authorized to access.", headers={"WWW-Authenticate": "Bearer"})

    try:
        user = await user_service.get_user_by_id(int(sub))
    except (UserIdDoesNotExist, ValueError):
        logger.warning("User ID %s from refresh token sub does not exist", sub)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="You must be authorized to access.", headers={"WWW-Authenticate": "Bearer"})

    if is_token_issued_before_password_update(decoded, user):
        logger.info("Refresh token for user ID %s was issued before their password was last updated", sub)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="You must be authorized to access.", headers={"WWW-Authenticate": "Bearer"})

    access_token = create_access_token(data={
        "sub": str(user.id),
    })

    store_access_token(response, access_token)
    response.status_code = 200
    return response

@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(response: Response):
    delete_tokens(response)
    response.status_code = 200
    return response