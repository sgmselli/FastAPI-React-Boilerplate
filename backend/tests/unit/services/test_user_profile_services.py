from io import BytesIO
import pytest
from PIL import Image

from app.exceptions.image import InvalidImage
from app.exceptions.s3 import S3ClientException
from app.models.user_profile import UserProfile
from app.schema.user_profile import UserProfileUpdate
from app.services.user_profile_services import UserProfileService
from tests.unit.mocks import make_mock_s3_client, make_mock_session


class TestUpdateProfile:
    async def test_applies_new_name_and_flushes(self):
        profile = UserProfile(user_id=1, name="Old Name")
        session = make_mock_session()

        result = await UserProfileService(session, make_mock_s3_client()).update_profile(profile, UserProfileUpdate(name="New Name"))

        assert result is profile
        assert profile.name == "New Name"
        session.add.assert_called_once_with(profile)
        session.flush.assert_awaited_once()
        session.commit.assert_not_awaited()

    async def test_leaves_other_fields_untouched(self):
        profile = UserProfile(user_id=1, name="Old Name")
        session = make_mock_session()

        await UserProfileService(session, make_mock_s3_client()).update_profile(profile, UserProfileUpdate(name="New Name"))

        assert profile.user_id == 1


def make_png() -> bytes:
    output = BytesIO()
    Image.new("RGB", (100, 100), "red").save(output, format="PNG")
    return output.getvalue()


class TestUpdateProfilePicture:
    async def test_uploads_processed_webp_under_a_new_key(self):
        profile = UserProfile(user_id=7)
        session = make_mock_session()
        s3_client = make_mock_s3_client()

        await UserProfileService(session, s3_client).update_profile_picture(profile, make_png())

        key, data, content_type = s3_client.upload_fileobj.await_args.args
        assert key.startswith("profile-pictures/7/") and key.endswith(".webp")
        assert content_type == "image/webp"
        assert Image.open(BytesIO(data)).format == "WEBP"

    async def test_saves_key_and_flushes(self):
        profile = UserProfile(user_id=7)
        session = make_mock_session()
        s3_client = make_mock_s3_client()

        result = await UserProfileService(session, s3_client).update_profile_picture(profile, make_png())

        assert result is profile
        assert profile.profile_picture_key == s3_client.upload_fileobj.await_args.args[0]
        session.add.assert_called_once_with(profile)
        session.flush.assert_awaited_once()
        session.commit.assert_not_awaited()

    async def test_each_upload_gets_a_unique_key(self):
        profile = UserProfile(user_id=7)
        service = UserProfileService(make_mock_session(), make_mock_s3_client())

        await service.update_profile_picture(profile, make_png())
        first_key = profile.profile_picture_key
        await service.update_profile_picture(profile, make_png())

        assert profile.profile_picture_key != first_key

    async def test_deletes_previous_picture_after_saving(self):
        profile = UserProfile(user_id=7, profile_picture_key="profile-pictures/7/old.webp")
        s3_client = make_mock_s3_client()

        await UserProfileService(make_mock_session(), s3_client).update_profile_picture(profile, make_png())

        s3_client.delete_object_quietly.assert_awaited_once_with("profile-pictures/7/old.webp")

    async def test_nothing_deleted_when_there_was_no_previous_picture(self):
        s3_client = make_mock_s3_client()

        await UserProfileService(make_mock_session(), s3_client).update_profile_picture(UserProfile(user_id=7), make_png())

        s3_client.delete_object_quietly.assert_not_awaited()

    async def test_invalid_image_uploads_nothing(self):
        profile = UserProfile(user_id=7, profile_picture_key="profile-pictures/7/old.webp")
        session = make_mock_session()
        s3_client = make_mock_s3_client()

        with pytest.raises(InvalidImage):
            await UserProfileService(session, s3_client).update_profile_picture(profile, b"not an image")

        s3_client.upload_fileobj.assert_not_awaited()
        session.flush.assert_not_awaited()
        assert profile.profile_picture_key == "profile-pictures/7/old.webp"

    async def test_upload_failure_leaves_profile_unchanged(self):
        profile = UserProfile(user_id=7, profile_picture_key="profile-pictures/7/old.webp")
        session = make_mock_session()
        s3_client = make_mock_s3_client()
        s3_client.upload_fileobj.side_effect = S3ClientException()

        with pytest.raises(S3ClientException):
            await UserProfileService(session, s3_client).update_profile_picture(profile, make_png())

        assert profile.profile_picture_key == "profile-pictures/7/old.webp"
        session.flush.assert_not_awaited()
        s3_client.delete_object_quietly.assert_not_awaited()

    async def test_flush_failure_removes_new_upload_and_keeps_old(self):
        profile = UserProfile(user_id=7, profile_picture_key="profile-pictures/7/old.webp")
        session = make_mock_session()
        session.flush.side_effect = RuntimeError("db down")
        s3_client = make_mock_s3_client()

        with pytest.raises(RuntimeError):
            await UserProfileService(session, s3_client).update_profile_picture(profile, make_png())

        new_key = s3_client.upload_fileobj.await_args.args[0]
        s3_client.delete_object_quietly.assert_awaited_once_with(new_key)


class TestDeleteProfilePicture:
    async def test_clears_key_flushes_and_deletes_object(self):
        profile = UserProfile(user_id=7, profile_picture_key="profile-pictures/7/old.webp")
        session = make_mock_session()
        s3_client = make_mock_s3_client()

        result = await UserProfileService(session, s3_client).delete_profile_picture(profile)

        assert result is profile
        assert profile.profile_picture_key is None
        session.flush.assert_awaited_once()
        s3_client.delete_object_quietly.assert_awaited_once_with("profile-pictures/7/old.webp")

    async def test_no_op_without_a_picture(self):
        session = make_mock_session()
        s3_client = make_mock_s3_client()

        await UserProfileService(session, s3_client).delete_profile_picture(UserProfile(user_id=7))

        session.flush.assert_not_awaited()
        s3_client.delete_object_quietly.assert_not_awaited()
