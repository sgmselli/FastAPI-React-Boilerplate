from pydantic_settings import SettingsConfigDict

from app.core.settings.base import BaseAppSettings

class TestSettings(BaseAppSettings):
    debug: bool = True
    allowed_hosts: list[str] = ["*"]
    allow_origins: list[str] = ["http://localhost:3000"]
    database_name: str = "boilerplatetestdb"
    database_host: str = "db"
    database_password: str = "password"
    database_user: str = "testdbadmin"
    access_secret_key: str = "test-access-secret"
    refresh_secret_key: str = "test-refresh-secret"
    session_secret_key: str = "test-session-secret"
    otp_secret_key: str = "test-otp-secret"
    redis_host: str = "redis"
    redis_port: int = 6379
    redis_db: int = 0
    frontend_url: str = "http://localhost:3000"

    @property
    def celery_broker_url(self) -> str:
        """
        Keeps queued tasks inside the test process.

        Publishing to the real Redis would hand every task the test suite
        triggers to whichever worker happens to be running - and that worker
        holds live Brevo credentials, so registering a user in a test sent a
        real email. An in-memory transport has no consumer at all.
        """
        return "memory://"

    @property
    def celery_result_backend(self) -> str:
        return "cache+memory://"

    model_config = SettingsConfigDict(
        env_file='.env.test',
        extra="ignore"
    )