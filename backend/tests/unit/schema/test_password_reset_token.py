import pytest
from pydantic import ValidationError

from app.schema.password_reset_token import ForgotPasswordRequest, ResetPasswordRequest


def make_reset(**overrides):
    data = {
        "token": "raw-token",
        "password": "Str0ng!Pass",
        "confirm_password": "Str0ng!Pass",
    }
    data.update(overrides)
    return ResetPasswordRequest(**data)


def error_types(exc_info: pytest.ExceptionInfo) -> set[str]:
    return {e["type"] for e in exc_info.value.errors()}


class TestForgotPasswordRequest:
    def test_valid_email_accepted(self):
        assert ForgotPasswordRequest(email="user@example.com").email == "user@example.com"

    def test_email_is_lowercased_and_stripped(self):
        # Must match the normalisation create_user_with_password applies,
        # otherwise the lookup misses and a real account looks unknown.
        request = ForgotPasswordRequest(email="  User@Example.com  ")
        assert request.email == "user@example.com"

    def test_malformed_email_rejected(self):
        with pytest.raises(ValidationError):
            ForgotPasswordRequest(email="not-an-email")


class TestResetPasswordRequestToken:
    def test_token_is_required(self):
        with pytest.raises(ValidationError):
            ResetPasswordRequest(password="Str0ng!Pass", confirm_password="Str0ng!Pass")


class TestResetPasswordRequestPassword:
    def test_valid_password_accepted(self):
        assert make_reset().password == "Str0ng!Pass"

    def test_mismatched_confirmation_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            make_reset(confirm_password="Different1!")
        assert "password_mismatch" in error_types(exc_info)

    def test_password_without_uppercase_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            make_reset(password="str0ng!pass", confirm_password="str0ng!pass")
        assert "password_uppercase" in error_types(exc_info)

    def test_password_without_number_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            make_reset(password="Strong!Pass", confirm_password="Strong!Pass")
        assert "password_digit" in error_types(exc_info)

    def test_password_without_special_character_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            make_reset(password="Str0ngPass", confirm_password="Str0ngPass")
        assert "password_special" in error_types(exc_info)

    def test_password_with_spaces_rejected(self):
        with pytest.raises(ValidationError) as exc_info:
            make_reset(password="Str0ng! Pass", confirm_password="Str0ng! Pass")
        assert "password_has_spaces" in error_types(exc_info)

    def test_password_over_max_length_rejected(self):
        too_long = "A1!" + ("a" * 126)
        with pytest.raises(ValidationError) as exc_info:
            make_reset(password=too_long, confirm_password=too_long)
        assert "password_too_long" in error_types(exc_info)
