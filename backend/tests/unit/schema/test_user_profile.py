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
        assert UserProfileCreate().model_dump() == {"first_name": None, "last_name": None}

    def test_explicit_none_is_accepted(self):
        profile = UserProfileCreate(first_name=None, last_name=None)
        assert (profile.first_name, profile.last_name) == (None, None)

    def test_names_are_stripped_but_case_preserved(self):
        profile = UserProfileCreate(first_name="  Jane  ", last_name="  McDoe  ")
        assert (profile.first_name, profile.last_name) == ("Jane", "McDoe")

    @pytest.mark.parametrize("field", ["first_name", "last_name"])
    def test_name_too_long_rejected(self, field):
        with pytest.raises(ValidationError) as exc_info:
            UserProfileCreate(**{field: "a" * 51})
        assert "name_too_long" in error_types(exc_info)

    @pytest.mark.parametrize("field", ["first_name", "last_name"])
    def test_name_with_invalid_characters_rejected(self, field):
        with pytest.raises(ValidationError) as exc_info:
            UserProfileCreate(**{field: "Jane@Doe!"})
        assert "name_invalid" in error_types(exc_info)


class TestUserProfileUpdate:
    def test_valid_names_accepted(self):
        profile = UserProfileUpdate(first_name="Jane_2", last_name="Doe-Smith")
        assert (profile.first_name, profile.last_name) == ("Jane_2", "Doe-Smith")

    def test_names_are_stripped_but_case_preserved(self):
        profile = UserProfileUpdate(first_name="  Jane  ", last_name="  McDoe  ")
        assert (profile.first_name, profile.last_name) == ("Jane", "McDoe")

    @pytest.mark.parametrize("field", ["first_name", "last_name"])
    def test_missing_name_rejected(self, field):
        data = {"first_name": "Jane", "last_name": "Doe"}
        del data[field]
        with pytest.raises(ValidationError) as exc_info:
            UserProfileUpdate(**data)
        assert "missing" in error_types(exc_info)

    @pytest.mark.parametrize("field", ["first_name", "last_name"])
    def test_whitespace_only_name_rejected(self, field):
        with pytest.raises(ValidationError) as exc_info:
            UserProfileUpdate(**{"first_name": "Jane", "last_name": "Doe", field: "   "})
        assert "name_too_short" in error_types(exc_info)

    @pytest.mark.parametrize("field", ["first_name", "last_name"])
    def test_name_too_long_rejected(self, field):
        with pytest.raises(ValidationError) as exc_info:
            UserProfileUpdate(**{"first_name": "Jane", "last_name": "Doe", field: "a" * 51})
        assert "name_too_long" in error_types(exc_info)

    @pytest.mark.parametrize("field", ["first_name", "last_name"])
    def test_name_with_invalid_characters_rejected(self, field):
        with pytest.raises(ValidationError) as exc_info:
            UserProfileUpdate(**{"first_name": "Jane", "last_name": "Doe", field: "Jane@Doe!"})
        assert "name_invalid" in error_types(exc_info)

    @pytest.mark.parametrize("field, label", [("first_name", "First name"), ("last_name", "Last name")])
    def test_error_message_names_the_field(self, field, label):
        with pytest.raises(ValidationError) as exc_info:
            UserProfileUpdate(**{"first_name": "Jane", "last_name": "Doe", field: "   "})
        assert exc_info.value.errors()[0]["msg"] == f"{label} must be at least 1 character"

    def test_unknown_fields_are_dropped(self):
        profile_update = UserProfileUpdate(first_name="Jane", last_name="Doe", user_id=99)
        assert profile_update.model_dump() == {"first_name": "Jane", "last_name": "Doe"}


class TestUserProfileResponse:
    def test_reads_completion_from_the_model(self):
        response = UserProfileResponse.model_validate(UserProfile(first_name="Jane", last_name="Doe"))
        assert response.model_dump() == {
            "first_name": "Jane", "last_name": "Doe", "is_profile_completed": True, "profile_picture_url": None
        }

    def test_empty_profile_is_not_completed(self):
        response = UserProfileResponse.model_validate(UserProfile())
        assert response.model_dump() == {
            "first_name": None, "last_name": None, "is_profile_completed": False, "profile_picture_url": None
        }


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
