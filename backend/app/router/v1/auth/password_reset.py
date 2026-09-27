from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.exceptions.password_reset_token import PasswordResetTokenDoesNotExist, PasswordResetTokenInvalid
from app.exceptions.user import UserEmailDoesNotExist
from app.schema.password_reset_token import (
    ForgotPasswordRequest,
    PasswordResetMessageResponse,
    ResetPasswordRequest,
    ValidateResetTokenRequest,
    ValidateResetTokenResponse,
)
from app.services.password_reset_token_services import PasswordResetTokenService, get_password_reset_token_service
from app.services.user_services import get_user_by_email, get_user_by_id, update_user_password
from app.celery.tasks.email_tasks import task_send_password_reset_email, task_send_password_reset_confirmation_email
from app.utils.logging import Logger, LogLevel

router = APIRouter()

GENERIC_REQUEST_MESSAGE = "If an account exists for that email, we've sent a password reset link."
INVALID_TOKEN_MESSAGE = "This password reset link is invalid or has expired."

@router.post('/request', response_model=PasswordResetMessageResponse, status_code=status.HTTP_202_ACCEPTED)
async def request_password_reset(
    forgot_password_request: ForgotPasswordRequest,
    session: AsyncSession = Depends(get_session),
    password_reset_token_service: PasswordResetTokenService = Depends(get_password_reset_token_service)
):
    email = forgot_password_request.email

    try:
        user = await get_user_by_email(email, session)
    except UserEmailDoesNotExist:
        Logger.log(LogLevel.INFO, "A password reset was requested for an email which does not exist")
        return PasswordResetMessageResponse(message=GENERIC_REQUEST_MESSAGE)

    raw_token = await password_reset_token_service.create(user.id)
    reset_url = password_reset_token_service.get_reset_url(raw_token)
    Logger.log(LogLevel.DEBUG, reset_url)

    try:
        task_send_password_reset_email.delay(user.email, user.name, reset_url)
    except Exception as e:
        Logger.log(LogLevel.ERROR, f"Failed to queue password reset email for user ID '{user.id}': {e}")

    return PasswordResetMessageResponse(message=GENERIC_REQUEST_MESSAGE)

@router.post('/validate', response_model=ValidateResetTokenResponse, status_code=status.HTTP_200_OK)
async def validate_password_reset_token(
    validate_reset_token_request: ValidateResetTokenRequest,
    password_reset_token_service: PasswordResetTokenService = Depends(get_password_reset_token_service)
):
    try:
        await password_reset_token_service.get_by_raw_token(validate_reset_token_request.token)
    except (PasswordResetTokenDoesNotExist, PasswordResetTokenInvalid):
        return ValidateResetTokenResponse(valid=False)

    return ValidateResetTokenResponse(valid=True)

@router.post('/confirm', response_model=PasswordResetMessageResponse, status_code=status.HTTP_200_OK)
async def confirm_password_reset(
    reset_password_request: ResetPasswordRequest,
    session: AsyncSession = Depends(get_session),
    password_reset_token_service: PasswordResetTokenService = Depends(get_password_reset_token_service)
):
    try:
        token = await password_reset_token_service.get_by_raw_token(reset_password_request.token)
    except (PasswordResetTokenDoesNotExist, PasswordResetTokenInvalid):
        Logger.log(LogLevel.ERROR, "A password reset was attempted with an invalid or expired token")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=INVALID_TOKEN_MESSAGE)

    user = await get_user_by_id(token.user_id, session)

    await password_reset_token_service.mark_as_used(token)
    await update_user_password(user, reset_password_request.password, session)

    try:
        task_send_password_reset_confirmation_email.delay(user.email, user.name)
    except Exception as e:
        Logger.log(LogLevel.ERROR, f"Failed to queue password reset confirmation email for user ID '{user.id}': {e}")

    return PasswordResetMessageResponse(message="Your password has been reset.")