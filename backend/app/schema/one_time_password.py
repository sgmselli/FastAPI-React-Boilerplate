from pydantic import BaseModel, EmailStr, Field, field_validator

from app.utils.normalizations import normalize_capital_senitive

class OneTimePasswordCreate(BaseModel):
    user_id: int
    code_hash: str

class VerifyOtpRequest(BaseModel):
    email: EmailStr
    code: str = Field(pattern=r"^\d{6}$")

    normalize_email = field_validator('email', mode="before")(normalize_capital_senitive)

class ResendOtpRequest(BaseModel):
    email: EmailStr

    normalize_email = field_validator('email', mode="before")(normalize_capital_senitive)

class OtpMessageResponse(BaseModel):
    message: str
