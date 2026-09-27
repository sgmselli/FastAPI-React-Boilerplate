from pydantic import BaseModel, EmailStr, field_validator, ValidationInfo
from pydantic_core import PydanticCustomError
import re

from app.utils.normalizations import normalize_capital_insenitive, normalize_capital_senitive
from app.utils.validations import validate_password_strength

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    name: str

    model_config = {"from_attributes": True}

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    google_id: str | None = None
    password: str | None = None
    confirm_password: str | None = None

    normalize_names = field_validator("name", mode="before")(normalize_capital_insenitive)
    normalize_email_name = field_validator('email', mode="before")(normalize_capital_senitive)

    @field_validator("name")
    def validate_name(cls, value: str):
        MINIMUM_CHARS = 1
        MAXIMUM_CHARS = 200
        NAME_MATCH = re.match(r"^[A-Za-z0-9._ -]+$", value)

        if len(value) < MINIMUM_CHARS:
            raise PydanticCustomError(
                "name_too_short",
                f"Name must be at least {MINIMUM_CHARS} character"
            )
        if len(value) > MAXIMUM_CHARS:
            raise PydanticCustomError(
                "name_too_long",
                f"Name must be less than {MAXIMUM_CHARS} characters"
            )
        if not NAME_MATCH:
            raise PydanticCustomError(
                "name_invalid",
                "Name can only contain letters, numbers, spaces, underscores, and hyphens"
            )
        return value

    @field_validator("password")
    def validate_password(cls, value: str | None, info: ValidationInfo):
        google_id = info.data.get("google_id")

        # Google auth user → no password needed
        if google_id and (value is None or value == ""):
            return value

        if not value:
            raise PydanticCustomError(
                "password_required",
                "Password is required"
            )

        return validate_password_strength(value)

    @field_validator("confirm_password")
    def validate_confirm_password(cls, value: str | None, info: ValidationInfo):
        password = info.data.get("password")
        google_id = info.data.get("google_id")

        if google_id:
            return value

        if not password:
            return value

        if value != password:
            raise PydanticCustomError(
                "password_mismatch",
                "Passwords do not match"
            )

        return value