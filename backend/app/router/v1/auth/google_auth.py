from fastapi import APIRouter, Depends, HTTPException, Request, status
from starlette.responses import RedirectResponse

from app.core.config import settings
from app.exceptions.user import UserGoogleIdDoesNotExist, UserEmailDoesNotExist
from app.schema.user import UserResponse, UserCreate
from app.services.user_services import UserService, get_user_service
from app.auth.jwt import create_access_token, create_refresh_token, store_tokens
from app.utils.logging import Logger, LogLevel
from app.auth.oauth.google_oauth import google_oath

router = APIRouter()

@router.get('/login', response_model=UserResponse, status_code=status.HTTP_200_OK)
async def auth_google_login(request: Request):
    return await google_oath.authorize_redirect(request, settings.google_redirect_url)

@router.get('/callback', response_model=UserResponse, status_code=status.HTTP_200_OK)
async def auth_google_callback(
    request: Request,
    user_service: UserService = Depends(get_user_service)
):
    try:
        token = await google_oath.authorize_access_token(request)

        google_user = token.get("userinfo")
        if google_user is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Failed to retrieve Google user profile")

        google_id = google_user["sub"]
        email = google_user.get("email")
        name = google_user.get("name")

        try:
            user = await user_service.get_user_by_google_id(google_id)
        except UserGoogleIdDoesNotExist:
            try:
                user = await user_service.get_user_by_email(email)
                await user_service.link_google_id(user, google_id)
            except UserEmailDoesNotExist:
                Logger.log(LogLevel.INFO, "Google ID does not exist for user. Creating user.")
                user_create = UserCreate(
                    email=email,
                    google_id=google_id
                )
                user = await user_service.create_user_without_password(user_create, name)
             
        access_token = create_access_token({"sub": str(user.id)})
        refresh_token = create_refresh_token({"sub": str(user.id)})

        redirect = RedirectResponse(
            url=f"{settings.frontend_url}/auth/callback",
            status_code=status.HTTP_302_FOUND
        )

        store_tokens(redirect, access_token, refresh_token)

        return redirect


    except Exception as e:
        Logger.log( LogLevel.ERROR, f"Google OAuth callback error: {str(e)}")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google authentication failed")