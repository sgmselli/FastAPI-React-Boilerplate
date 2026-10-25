import logging
from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.exceptions.user import UserAlreadyExists
from app.schema.user import UserResponse, UserCreate
from app.services.one_time_password_services import OneTimePasswordService, get_one_time_password_service
from app.services.user_services import UserService, get_user_service
from app.services.user_profile_services import UserProfileService, get_user_profile_service
from app.models.user import User
from app.auth.current_user import get_current_user_or_raise_http_error
from app.auth.jwt import delete_tokens
from app.celery.tasks.email_tasks import task_send_otp_email, task_send_account_deleted_email

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/current", response_model=UserResponse)
async def get_current_user_data(current_user: User = Depends(get_current_user_or_raise_http_error)):
    return current_user

@router.delete("/current", status_code=status.HTTP_204_NO_CONTENT)
async def delete_current_user(
    response: Response,
    current_user: User = Depends(get_current_user_or_raise_http_error),
    user_service: UserService = Depends(get_user_service),
    user_profile_service: UserProfileService = Depends(get_user_profile_service)
):
    user_id, email, name = current_user.id, current_user.email, current_user.display_name

    # The database cascade removes the profile row but not its object in the bucket
    await user_profile_service.delete_profile_picture(current_user.profile)
    await user_service.delete_user(current_user)
    delete_tokens(response)
    logger.info("Deleted account for user ID %s", user_id)

    try:
        task_send_account_deleted_email.delay(email, name)
    except Exception:
        logger.exception("Failed to queue account deleted email for user ID %s", user_id)

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_create: UserCreate,
    user_service: UserService = Depends(get_user_service),
    otp_service: OneTimePasswordService = Depends(get_one_time_password_service)
):
    try:
        user = await user_service.create_user_with_password(user_create)
    except UserAlreadyExists as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    raw_code = await otp_service.create(user.id)

    try:
        task_send_otp_email.delay(user.email, user.display_name, raw_code)
    except Exception:
        logger.exception("Failed to queue one time password email for user ID %s", user.id)

    return user