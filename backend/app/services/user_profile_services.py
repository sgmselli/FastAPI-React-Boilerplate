from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.models.user_profile import UserProfile
from app.schema.user_profile import UserProfileUpdate

class UserProfileService:

    def __init__(self, session: AsyncSession):
        self.session = session

    async def update_profile(self, profile: UserProfile, profile_update: UserProfileUpdate) -> UserProfile:
        for field, value in profile_update.model_dump(exclude_unset=True).items():
            setattr(profile, field, value)

        self.session.add(profile)
        await self.session.flush()

        return profile

def get_user_profile_service(session: AsyncSession = Depends(get_session)) -> UserProfileService:
    return UserProfileService(session)
