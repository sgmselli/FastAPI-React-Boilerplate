from pydantic_core import PydanticCustomError
import re

def validate_password_strength(value: str) -> str:
    MINIMUM_CHARS = 1
    MAXIMUM_CHARS = 128
    CONTAINS_UPPER_CASE = re.search(r"[A-Z]", value)
    CONTAINS_NUMBER = re.search(r"\d", value)
    CONTAINS_SPECIAL = re.search(r"[!@#$%^&*(),.?\":{}|<>]", value)

    if len(value) < MINIMUM_CHARS:
        raise PydanticCustomError(
            "password_too_short",
            f"Password must be at least {MINIMUM_CHARS} characters"
        )
    if len(value) > MAXIMUM_CHARS:
        raise PydanticCustomError(
            "password_too_long",
            f"Password must be less than or equal to {MAXIMUM_CHARS} characters"
        )
    if " " in value:
        raise PydanticCustomError(
            "password_has_spaces",
            "Password cannot contain spaces"
        )
    if not CONTAINS_UPPER_CASE:
        raise PydanticCustomError(
            "password_uppercase",
            "Password must contain at least one uppercase letter"
        )
    if not CONTAINS_NUMBER:
        raise PydanticCustomError(
            "password_digit",
            "Password must contain at least one number"
        )
    if not CONTAINS_SPECIAL:
        raise PydanticCustomError(
            "password_special",
            "Password must contain at least one special character"
        )
    return value
