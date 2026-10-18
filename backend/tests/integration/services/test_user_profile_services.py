from sqlalchemy.ext.asyncio import AsyncSession

from app.schema.user_profile import UserProfileUpdate
from app.services.user_profile_services import UserProfileService
from app.services.user_services import UserService


class TestUpdateProfile:
    async def test_persists_new_name(self, db_session: AsyncSession, make_user):
        created = await make_user(email="rename@example.com", name="Old Name")
        user_id = created.id

        await UserProfileService(db_session).update_profile(created.profile, UserProfileUpdate(name="New Name"))
        await db_session.commit()
        db_session.expire_all()

        found = await UserService(db_session).get_user_by_id(user_id)
        assert found.profile.name == "New Name"
        assert found.email == "rename@example.com"
