from pydantic import BaseModel, field_validator

from app.utils.normalizations import normalize_capital_insenitive
from app.utils.validations import validate_name

class UserProfileCreate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None

    # Profiles start empty, so None skips normalization and validation.
    @field_validator("first_name", "last_name", mode="before")
    @classmethod
    def normalize_names(cls, value: str | None) -> str | None:
        return None if value is None else normalize_capital_insenitive(value)

    @field_validator("first_name")
    @classmethod
    def validate_first_name(cls, value: str | None) -> str | None:
        return None if value is None else validate_name(value, "First name")

    @field_validator("last_name")
    @classmethod
    def validate_last_name(cls, value: str | None) -> str | None:
        return None if value is None else validate_name(value, "Last name")

class UserProfileUpdate(BaseModel):
    first_name: str
    last_name: str

    normalize_names = field_validator("first_name", "last_name", mode="before")(normalize_capital_insenitive)

    @field_validator("first_name")
    @classmethod
    def validate_first_name(cls, value: str) -> str:
        return validate_name(value, "First name")

    @field_validator("last_name")
    @classmethod
    def validate_last_name(cls, value: str) -> str:
        return validate_name(value, "Last name")

class UserProfileResponse(BaseModel):
    first_name: str | None
    last_name: str | None
    is_profile_completed: bool

    model_config = {"from_attributes": True}
