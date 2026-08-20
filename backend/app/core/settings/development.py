from pydantic_settings import SettingsConfigDict

from app.core.settings.base import BaseAppSettings

class DevelopmentSettings(BaseAppSettings):
    debug: bool = True
    frontend_url: str = "http://localhost:3000"
    allowed_hosts: list[str] = ["*"]
    allow_origins: list[str] = ["http://localhost:3000"]
    database_name: str = "boilerplatedb"
    database_host: str = "db"
    database_password: str = "password"
    database_user: str = "dbadmin"
    google_redirect_url: str = "http://localhost:3000/api/v1/auth/google/callback"

    model_config = SettingsConfigDict(
        env_file='.env',
        extra="ignore"
    )