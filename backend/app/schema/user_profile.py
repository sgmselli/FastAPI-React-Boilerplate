from pydantic import BaseModel, field_validator

from app.utils.normalizations import normalize_capital_insenitive
from app.utils.validations import validate_name

class UserProfileCreate(BaseModel):
    name: str | None = None

    # Profiles start empty, so None skips normalization and validation.
    @field_validator("name", mode="before")
    @classmethod
    def normalize_names(cls, value: str | None) -> str | None:
        return None if value is None else normalize_capital_insenitive(value)

    @field_validator("name")
    @classmethod
    def validate_names(cls, value: str | None) -> str | None:
        return None if value is None else validate_name(value)

class UserProfileUpdate(BaseModel):
    name: str

    normalize_names = field_validator("name", mode="before")(normalize_capital_insenitive)
    validate_names = field_validator("name")(validate_name)

class UserProfileResponse(BaseModel):
    name: str | None
    is_profile_completed: bool

    model_config = {"from_attributes": True}
