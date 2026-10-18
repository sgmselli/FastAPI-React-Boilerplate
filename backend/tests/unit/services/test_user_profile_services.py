from app.models.user_profile import UserProfile
from app.schema.user_profile import UserProfileUpdate
from app.services.user_profile_services import UserProfileService
from tests.unit.mocks import make_mock_session


class TestUpdateProfile:
    async def test_applies_new_name_and_flushes(self):
        profile = UserProfile(user_id=1, name="Old Name")
        session = make_mock_session()

        result = await UserProfileService(session).update_profile(profile, UserProfileUpdate(name="New Name"))

        assert result is profile
        assert profile.name == "New Name"
        session.add.assert_called_once_with(profile)
        session.flush.assert_awaited_once()
        session.commit.assert_not_awaited()

    async def test_leaves_other_fields_untouched(self):
        profile = UserProfile(user_id=1, name="Old Name")
        session = make_mock_session()

        await UserProfileService(session).update_profile(profile, UserProfileUpdate(name="New Name"))

        assert profile.user_id == 1
