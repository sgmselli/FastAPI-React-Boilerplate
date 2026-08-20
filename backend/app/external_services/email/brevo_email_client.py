from sib_api_v3_sdk import ApiClient, Configuration, TransactionalEmailsApi, SendSmtpEmail

from app.external_services.email.email_client import EmailClient
from app.enums.email_templates import EmailTemplatesId
from app.core.config import settings
from app.utils.logging import Logger, LogLevel

class BrevoEmailClient(EmailClient):
    
    def __init__(self):
        config = Configuration()
        config.api_key["api-key"] = settings.brevo_api_key
        self.client = TransactionalEmailsApi(ApiClient(config))

    def send_email(self, template_id: EmailTemplatesId, from_email: str, to_email: str, data: dict[str, str] | None = None):
        message = SendSmtpEmail(
            sender={"email": from_email},
            to=[{"email": to_email}],
            template_id=template_id.value
        )
        if data:
            message.params = data
        try:
            self.client.send_transac_email(message)
        except Exception as e:
            Logger.log(LogLevel.ERROR, str(e))
            raise