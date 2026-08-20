from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, status
from fastapi.security import OAuth2PasswordRequestForm
from uuid import uuid4

from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.exceptions.user import UserEmailDoesNotExist
from app.schema.user import UserResponse
from app.services.user_services import get_user_by_email
from app.auth.jwt import create_access_token, create_refresh_token, store_tokens, decode_refresh_token, \
    store_access_token, delete_tokens
from app.auth.password import verify_password
from app.utils.logging import Logger, LogLevel

router = APIRouter()

@router.post('/login', response_model=UserResponse, status_code=status.HTTP_200_OK)
async def login(
    response: Response,
    session: AsyncSession = Depends(get_session),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    email = form_data.username
    password = form_data.password

    try:
        user = await get_user_by_email(email, session)
    except UserEmailDoesNotExist:
        Logger.log(LogLevel.ERROR, f"A user entered an email '{email}' which does not exist")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password.")

    if user.password is None or not verify_password(password, user.password):
        Logger.log(LogLevel.ERROR, f"A user entered an incorrect password for email '{email}'")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect username or password.")

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
async def refresh_auth_tokens(response: Response, refresh_token: str = Cookie(None)):
    if refresh_token is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="You must be authorized to access.", headers={"WWW-Authenticate": "Bearer"})

    try:
        decoded = decode_refresh_token(refresh_token)
    except JWTError as e:
        Logger.log(LogLevel.ERROR, f"Failed to decode refresh token due to error: '{e}'")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="You must be authorized to access.", headers={"WWW-Authenticate": "Bearer"})

    sub = decoded.get("sub")
    access_token = create_access_token(data={
        "sub": sub,
    })

    store_access_token(response, access_token)
    response.status_code = 200
    return response

@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(response: Response):
    delete_tokens(response)
    response.status_code = 200
    return response