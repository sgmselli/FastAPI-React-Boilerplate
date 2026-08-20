import pytest
from pydantic import ValidationError

from app.schema.user import UserCreate


def make(**overrides):
    data = {
        "email": "User@Example.com",
        "name": "Jane Doe",
        "password": "Str0ng!Pass",
        "confirm_password": "Str0ng!Pass",
    }
    data.update(overrides)
    return UserCreate(**data)


def error_types(exc_info: pytest.ExceptionInfo) -> set[str]:
    return {e["type"] for e in exc_info.value.errors()}


class TestEmail:
    def test_valid_email_accepted(self):
        user = make(email="user@example.com")
        assert user.email == "user@example.com"

    def test_malformed_email_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            make(email="not-an-email")
        assert "value_error" in error_types(exc_info)

    def test_email_missing_domain_rejected(self):
        with pytest.raises(ValidationError):
            make(email="user@")

    def test_email_is_lowercased_and_stripped(self):
        user = make(email="  User@Example.com  ")
        assert user.email == "user@example.com"


class TestName:
    def test_valid_name_accepted(self):
        user = make(name="Jane_Doe-2")
        assert user.name == "Jane_Doe-2"

    def test_name_is_stripped_but_case_preserved(self):
        user = make(name="  Jane Doe  ")
        assert user.name == "Jane Doe"

    def test_name_too_long_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            make(name="a" * 201)
        assert "name_too_long" in error_types(exc_info)

    def test_name_with_invalid_characters_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            make(name="Jane@Doe!")
        assert "name_invalid" in error_types(exc_info)

    def test_empty_name_rejected(self):
        with pytest.raises(ValidationError):
            make(name="")


class TestPassword:
    def test_missing_password_rejected_for_non_google_user(self):
        with pytest.raises(ValidationError) as exc_info:
            make(password=None, confirm_password=None)
        assert "password_required" in error_types(exc_info)

    def test_empty_password_rejected_for_non_google_user(self):
        with pytest.raises(ValidationError) as exc_info:
            make(password="", confirm_password="")
        assert "password_required" in error_types(exc_info)

    def test_google_user_without_password_is_valid(self):
        user = make(password=None, confirm_password=None, google_id="google-123")
        assert user.password is None

    def test_password_too_long_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            make(password="Aa1!" * 40, confirm_password="Aa1!" * 40)
        assert "password_too_long" in error_types(exc_info)

    def test_password_with_spaces_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            make(password="Str0ng! Pass", confirm_password="Str0ng! Pass")
        assert "password_has_spaces" in error_types(exc_info)

    def test_password_without_uppercase_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            make(password="str0ng!pass", confirm_password="str0ng!pass")
        assert "password_uppercase" in error_types(exc_info)

    def test_password_without_digit_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            make(password="Strong!Pass", confirm_password="Strong!Pass")
        assert "password_digit" in error_types(exc_info)

    def test_password_without_special_char_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            make(password="Str0ngPass", confirm_password="Str0ngPass")
        assert "password_special" in error_types(exc_info)

    def test_valid_password_accepted(self):
        user = make(password="Str0ng!Pass", confirm_password="Str0ng!Pass")
        assert user.password == "Str0ng!Pass"


class TestConfirmPassword:
    def test_mismatched_confirm_password_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            make(password="Str0ng!Pass", confirm_password="Different1!")
        assert "password_mismatch" in error_types(exc_info)

    def test_matching_confirm_password_accepted(self):
        user = make(password="Str0ng!Pass", confirm_password="Str0ng!Pass")
        assert user.confirm_password == "Str0ng!Pass"

    def test_confirm_password_skipped_for_google_user(self):
        # google_id short-circuits confirm_password validation entirely,
        # so a mismatch is *not* an error in this path.
        user = make(
            google_id="google-123",
            password=None,
            confirm_password="anything-at-all",
        )
        assert user.confirm_password == "anything-at-all"