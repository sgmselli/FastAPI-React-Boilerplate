from pydantic import BaseModel, EmailStr, field_validator, ValidationInfo
from pydantic_core import PydanticCustomError
from datetime import datetime

from app.utils.normalizations import normalize_capital_senitive
from app.utils.validations import validate_password_strength

class PasswordResetTokenCreate(BaseModel):
    user_id: int
    token_hash: str

class PasswordResetTokenResponse(BaseModel):
    id: int
    user_id: int
    used_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    normalize_email = field_validator('email', mode="before")(normalize_capital_senitive)

class ValidateResetTokenRequest(BaseModel):
    token: str

class ValidateResetTokenResponse(BaseModel):
    valid: bool

class ResetPasswordRequest(BaseModel):
    token: str
    password: str
    confirm_password: str

    @field_validator("password")
    def validate_password(cls, value: str):
        return validate_password_strength(value)

    @field_validator("confirm_password")
    def validate_confirm_password(cls, value: str, info: ValidationInfo):
        password = info.data.get("password")

        if not password:
            return value

        if value != password:
            raise PydanticCustomError(
                "password_mismatch",
                "Passwords do not match"
            )

        return value

class PasswordResetMessageResponse(BaseModel):
    message: str
