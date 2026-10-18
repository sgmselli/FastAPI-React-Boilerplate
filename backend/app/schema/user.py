from pydantic import BaseModel, EmailStr, field_validator, ValidationInfo
from pydantic_core import PydanticCustomError

from app.utils.normalizations import normalize_capital_senitive
from app.utils.validations import validate_password_strength
from app.schema.user_profile import UserProfileResponse

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    profile: UserProfileResponse

    model_config = {"from_attributes": True}

class UserCreate(BaseModel):
    email: EmailStr
    google_id: str | None = None
    password: str | None = None
    confirm_password: str | None = None

    normalize_email_name = field_validator('email', mode="before")(normalize_capital_senitive)

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