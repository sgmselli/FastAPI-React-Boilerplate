from fastapi import APIRouter, Depends

from app.schema.user import UserResponse
from app.schema.user_profile import UserProfileUpdate
from app.services.user_profile_services import UserProfileService, get_user_profile_service
from app.models.user import User
from app.auth.current_user import get_current_user_or_raise_http_error

router = APIRouter()

@router.patch("/current", response_model=UserResponse)
async def update_current_user_profile(
    profile_update: UserProfileUpdate,
    current_user: User = Depends(get_current_user_or_raise_http_error),
    user_profile_service: UserProfileService = Depends(get_user_profile_service)
):
    await user_profile_service.update_profile(current_user.profile, profile_update)
    return current_user
