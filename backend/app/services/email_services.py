from app.enums.email_templates import EmailTemplatesId
from app.external_services.email.brevo_email_client import BrevoEmailClient
from app.external_services.email.email_client import EmailClient
from app.core.config import settings

class EmailService:
    def __init__(self, client: EmailClient):
        self.client = client

    def send_welcome_email(self, to_email: str, name: str):
        return self.client.send_email(
            template_id=EmailTemplatesId.WELCOME,
            from_email=settings.from_email,
            to_email=to_email,
            data={"name": name},
        )

email_service = EmailService(BrevoEmailClient())