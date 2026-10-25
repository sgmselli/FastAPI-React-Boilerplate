from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.core.config import settings
from app.exceptions.image import InvalidImage
from app.exceptions.s3 import S3ClientException
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

@router.put("/current/picture", response_model=UserResponse)
async def update_current_user_profile_picture(
    file: UploadFile,
    current_user: User = Depends(get_current_user_or_raise_http_error),
    user_profile_service: UserProfileService = Depends(get_user_profile_service)
):
    # Read one byte past the limit, so an oversized file is caught by the size check
    # without pulling the whole thing into memory
    data = await file.read(settings.profile_picture_max_bytes + 1)

    try:
        await user_profile_service.update_profile_picture(current_user.profile, data)
    except InvalidImage as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(e))
    except S3ClientException:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to upload your profile picture. Please try again.")

    return current_user

@router.delete("/current/picture", response_model=UserResponse)
async def delete_current_user_profile_picture(
    current_user: User = Depends(get_current_user_or_raise_http_error),
    user_profile_service: UserProfileService = Depends(get_user_profile_service)
):
    await user_profile_service.delete_profile_picture(current_user.profile)
    return current_user
