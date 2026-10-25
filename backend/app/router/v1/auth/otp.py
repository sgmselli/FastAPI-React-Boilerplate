import logging
from fastapi import APIRouter, Depends, HTTPException, Response, status
from uuid import uuid4

from app.exceptions.one_time_password import OneTimePasswordDoesNotExist, OneTimePasswordIncorrect, OneTimePasswordInvalid
from app.exceptions.user import UserEmailDoesNotExist
from app.schema.one_time_password import OtpMessageResponse, ResendOtpRequest, VerifyOtpRequest
from app.schema.user import UserResponse
from app.services.one_time_password_services import OneTimePasswordService, get_one_time_password_service
from app.services.user_services import UserService, get_user_service
from app.auth.jwt import create_access_token, create_refresh_token, store_tokens
from app.celery.tasks.email_tasks import task_send_otp_email, task_send_welcome_email

logger = logging.getLogger(__name__)

router = APIRouter()

INVALID_CODE_MESSAGE = "This code is invalid or has expired."
GENERIC_RESEND_MESSAGE = "If that account still needs verifying, we've sent a new code."

@router.post('/verify', response_model=UserResponse, status_code=status.HTTP_200_OK)
async def verify_otp(
    response: Response,
    verify_otp_request: VerifyOtpRequest,
    user_service: UserService = Depends(get_user_service),
    otp_service: OneTimePasswordService = Depends(get_one_time_password_service)
):
    try:
        user = await user_service.get_user_by_email(verify_otp_request.email)
    except UserEmailDoesNotExist:
        logger.info("A one time password was submitted for an email which does not exist")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=INVALID_CODE_MESSAGE)

    if user.is_email_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=INVALID_CODE_MESSAGE)

    try:
        await otp_service.verify(user.id, verify_otp_request.code)
    except (OneTimePasswordDoesNotExist, OneTimePasswordInvalid, OneTimePasswordIncorrect) as e:
        logger.info("One time password rejected for user ID %s: %s", user.id, e)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=INVALID_CODE_MESSAGE)

    await user_service.mark_email_verified(user)

    access_token = create_access_token({
        "sub": str(user.id)
    })
    refresh_token = create_refresh_token({
        "sub": str(user.id),
        "jti": str(uuid4())
    })
    store_tokens(response, access_token, refresh_token)

    try:
        task_send_welcome_email.delay(user.email, user.display_name)
    except Exception:
        logger.exception("Failed to queue welcome email for user ID %s", user.id)

    return UserResponse.model_validate(user)

@router.post('/resend', response_model=OtpMessageResponse, status_code=status.HTTP_202_ACCEPTED)
async def resend_otp(
    resend_otp_request: ResendOtpRequest,
    user_service: UserService = Depends(get_user_service),
    otp_service: OneTimePasswordService = Depends(get_one_time_password_service)
):
    try:
        user = await user_service.get_user_by_email(resend_otp_request.email)
    except UserEmailDoesNotExist:
        logger.info("A one time password resend was requested for an email which does not exist")
        return OtpMessageResponse(message=GENERIC_RESEND_MESSAGE)

    if user.is_email_verified or not await otp_service.can_resend(user.id):
        return OtpMessageResponse(message=GENERIC_RESEND_MESSAGE)

    raw_code = await otp_service.create(user.id)

    try:
        task_send_otp_email.delay(user.email, user.display_name, raw_code)
    except Exception:
        logger.exception("Failed to queue one time password email for user ID %s", user.id)

    return OtpMessageResponse(message=GENERIC_RESEND_MESSAGE)
