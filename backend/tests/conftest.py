import os

# Must happen before app.core.config is imported, which is what picks the
# settings class. Without it the suite loads DevelopmentSettings.
os.environ.setdefault("APP_ENV", "TEST")

import pytest

from app.services import email_services
from app.utils.logging import Logger, LogLevel

class MockEmailService:
    def __init__(self):
        self.sent: list[dict] = []

    def send_welcome_email(self, to_email: str, name: str):
        self._record("welcome", to_email=to_email, name=name)

    def send_password_reset_email(self, to_email: str, name: str, reset_url: str):
        self._record("password_reset", to_email=to_email, name=name, reset_url=reset_url)

    def send_password_reset_confirmation_email(self, to_email: str, name: str):
        self._record("password_reset_confirmation", to_email=to_email, name=name)

    def send_otp_email(self, to_email: str, name: str, code: str):
        self._record("otp", to_email=to_email, name=name, code=code)

    def send_account_deleted_email(self, to_email: str, name: str):
        self._record("account_deleted", to_email=to_email, name=name)

    def _record(self, email: str, **fields):
        self.sent.append({"email": email, **fields})
        Logger.log(LogLevel.INFO, f"Mock email service: would have sent '{email}' to {fields['to_email']}")

@pytest.fixture
def mock_email_service() -> MockEmailService:
    return MockEmailService()

@pytest.fixture(autouse=True)
def never_send_real_email(monkeypatch, mock_email_service):
    monkeypatch.setattr(email_services, "get_email_service", lambda: mock_email_service)
