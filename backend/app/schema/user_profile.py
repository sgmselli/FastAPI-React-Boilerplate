from pydantic import BaseModel, Field, computed_field, field_validator

from app.core.config import settings
from app.exceptions.s3 import S3ClientException
from app.external_services.s3_client import get_s3_client
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
    # Read from the model to sign the URL, but never sent - the key is an internal detail
    profile_picture_key: str | None = Field(default=None, exclude=True)

    model_config = {"from_attributes": True}

    # Signed per response rather than stored, as presigned URLs expire. None tells the
    # frontend to show the default image, including when signing fails.
    @computed_field
    @property
    def profile_picture_url(self) -> str | None:
        if not self.profile_picture_key:
            return None
        try:
            return get_s3_client().generate_presigned_url(
                self.profile_picture_key,
                expires_in=settings.profile_picture_url_expire_seconds
            )
        except S3ClientException:
            return None
