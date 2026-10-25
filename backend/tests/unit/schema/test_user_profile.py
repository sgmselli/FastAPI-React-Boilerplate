import pytest

from app.exceptions.s3 import S3ClientException
from pydantic import ValidationError

from app.models.user_profile import UserProfile
from tests.unit.mocks import make_mock_s3_client
from app.schema.user_profile import UserProfileCreate, UserProfileResponse, UserProfileUpdate


def error_types(exc_info: pytest.ExceptionInfo) -> set[str]:
    return {e["type"] for e in exc_info.value.errors()}


class TestUserProfileCreate:
    def test_defaults_to_an_empty_profile(self):
        assert UserProfileCreate().model_dump() == {"name": None}

    def test_explicit_none_is_accepted(self):
        assert UserProfileCreate(name=None).name is None

    def test_name_is_stripped_but_case_preserved(self):
        assert UserProfileCreate(name="  Jane Doe  ").name == "Jane Doe"

    def test_name_too_long_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            UserProfileCreate(name="a" * 51)
        assert "name_too_long" in error_types(exc_info)

    def test_name_with_invalid_characters_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            UserProfileCreate(name="Jane@Doe!")
        assert "name_invalid" in error_types(exc_info)


class TestUserProfileUpdate:
    def test_valid_name_accepted(self):
        assert UserProfileUpdate(name="Jane_Doe-2").name == "Jane_Doe-2"

    def test_name_is_stripped_but_case_preserved(self):
        assert UserProfileUpdate(name="  Jane Doe  ").name == "Jane Doe"

    def test_missing_name_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            UserProfileUpdate()
        assert "missing" in error_types(exc_info)

    def test_whitespace_only_name_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            UserProfileUpdate(name="   ")
        assert "name_too_short" in error_types(exc_info)

    def test_name_too_long_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            UserProfileUpdate(name="a" * 51)
        assert "name_too_long" in error_types(exc_info)

    def test_name_with_invalid_characters_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            UserProfileUpdate(name="Jane@Doe!")
        assert "name_invalid" in error_types(exc_info)

    def test_unknown_fields_are_dropped(self):
        profile_update = UserProfileUpdate(name="Jane Doe", user_id=99)
        assert profile_update.model_dump() == {"name": "Jane Doe"}


class TestUserProfileResponse:
    def test_reads_completion_from_the_model(self):
        response = UserProfileResponse.model_validate(UserProfile(name="Jane Doe"))
        assert response.model_dump() == {"name": "Jane Doe", "is_profile_completed": True, "profile_picture_url": None}

    def test_empty_profile_is_not_completed(self):
        response = UserProfileResponse.model_validate(UserProfile())
        assert response.model_dump() == {"name": None, "is_profile_completed": False, "profile_picture_url": None}


class TestProfilePictureUrl:
    def test_none_without_a_picture_and_s3_untouched(self, monkeypatch):
        s3_client = make_mock_s3_client()
        monkeypatch.setattr("app.schema.user_profile.get_s3_client", lambda: s3_client)

        response = UserProfileResponse.model_validate(UserProfile())

        assert response.profile_picture_url is None
        s3_client.generate_presigned_url.assert_not_called()

    def test_signed_url_for_the_stored_key(self, monkeypatch):
        s3_client = make_mock_s3_client()
        monkeypatch.setattr("app.schema.user_profile.get_s3_client", lambda: s3_client)

        response = UserProfileResponse.model_validate(UserProfile(profile_picture_key="profile-pictures/1/a.webp"))

        assert response.profile_picture_url == "https://bucket.test/profile-pictures/1/a.webp?signed"
        s3_client.generate_presigned_url.assert_called_once_with("profile-pictures/1/a.webp", expires_in=3600)

    def test_key_is_never_serialised(self, monkeypatch):
        monkeypatch.setattr("app.schema.user_profile.get_s3_client", make_mock_s3_client)

        response = UserProfileResponse.model_validate(UserProfile(profile_picture_key="profile-pictures/1/a.webp"))

        assert "profile_picture_key" not in response.model_dump()
        assert "profile_picture_key" not in response.model_dump_json()

    def test_none_when_signing_fails(self, monkeypatch):
        s3_client = make_mock_s3_client()
        s3_client.generate_presigned_url.side_effect = S3ClientException()
        monkeypatch.setattr("app.schema.user_profile.get_s3_client", lambda: s3_client)

        response = UserProfileResponse.model_validate(UserProfile(profile_picture_key="profile-pictures/1/a.webp"))

        assert response.profile_picture_url is None
