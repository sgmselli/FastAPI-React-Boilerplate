from uuid import uuid4
from fastapi import Depends
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.external_services.s3_client import S3Client, get_s3_client
from app.models.user_profile import UserProfile
from app.schema.user_profile import UserProfileUpdate
from app.utils.images import PROFILE_PICTURE_CONTENT_TYPE, process_profile_picture

class UserProfileService:

    def __init__(self, session: AsyncSession, s3_client: S3Client):
        self.session = session
        self.s3_client = s3_client

    async def update_profile(self, profile: UserProfile, profile_update: UserProfileUpdate) -> UserProfile:
        for field, value in profile_update.model_dump(exclude_unset=True).items():
            setattr(profile, field, value)

        self.session.add(profile)
        await self.session.flush()

        return profile

    async def update_profile_picture(self, profile: UserProfile, data: bytes) -> UserProfile:
        # Decoding and resizing is CPU-bound, so keep it off the event loop
        processed = await run_in_threadpool(process_profile_picture, data)

        # A fresh key per upload, as the client marks objects immutable for caching
        new_key = f"profile-pictures/{profile.user_id}/{uuid4().hex}.webp"
        await self.s3_client.upload_fileobj(new_key, processed, PROFILE_PICTURE_CONTENT_TYPE)

        old_key = profile.profile_picture_key
        profile.profile_picture_key = new_key
        self.session.add(profile)

        try:
            await self.session.flush()
        except Exception:
            await self.s3_client.delete_object_quietly(new_key)
            raise

        if old_key:
            await self.s3_client.delete_object_quietly(old_key)

        return profile

    async def delete_profile_picture(self, profile: UserProfile) -> UserProfile:
        old_key = profile.profile_picture_key
        if not old_key:
            return profile

        profile.profile_picture_key = None
        self.session.add(profile)
        await self.session.flush()

        await self.s3_client.delete_object_quietly(old_key)

        return profile

def get_user_profile_service(
    session: AsyncSession = Depends(get_session),
    s3_client: S3Client = Depends(get_s3_client)
) -> UserProfileService:
    return UserProfileService(session, s3_client)
