from io import BytesIO
from PIL import Image
from sqlalchemy.ext.asyncio import AsyncSession

from app.schema.user_profile import UserProfileUpdate
from app.services.user_profile_services import UserProfileService
from app.services.user_services import UserService
from tests.unit.mocks import make_mock_s3_client


class TestUpdateProfile:
    async def test_persists_new_name(self, db_session: AsyncSession, make_user):
        created = await make_user(email="rename@example.com", name="Old Name")
        user_id = created.id

        await UserProfileService(db_session, make_mock_s3_client()).update_profile(created.profile, UserProfileUpdate(name="New Name"))
        await db_session.commit()
        db_session.expire_all()

        found = await UserService(db_session).get_user_by_id(user_id)
        assert found.profile.name == "New Name"
        assert found.email == "rename@example.com"


def make_png() -> bytes:
    output = BytesIO()
    Image.new("RGB", (100, 100), "red").save(output, format="PNG")
    return output.getvalue()


class TestProfilePicture:
    async def test_persists_uploaded_key(self, db_session: AsyncSession, make_user):
        created = await make_user(email="picture@example.com")
        user_id = created.id

        await UserProfileService(db_session, make_mock_s3_client()).update_profile_picture(created.profile, make_png())
        key = created.profile.profile_picture_key
        await db_session.commit()
        db_session.expire_all()

        found = await UserService(db_session).get_user_by_id(user_id)
        assert found.profile.profile_picture_key == key
        assert key.startswith(f"profile-pictures/{user_id}/")

    async def test_persists_cleared_key(self, db_session: AsyncSession, make_user):
        created = await make_user(email="nopicture@example.com")
        user_id = created.id
        service = UserProfileService(db_session, make_mock_s3_client())

        await service.update_profile_picture(created.profile, make_png())
        await service.delete_profile_picture(created.profile)
        await db_session.commit()
        db_session.expire_all()

        found = await UserService(db_session).get_user_by_id(user_id)
        assert found.profile.profile_picture_key is None
