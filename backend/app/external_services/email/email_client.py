from abc import abstractmethod, ABC

from app.enums.email_templates import EmailTemplatesId

class EmailClient(ABC):
    
    @abstractmethod
    def send_email(self, template_id: EmailTemplatesId, from_email: str, to_email: str, data: dict[str, str] | None = None):
        pass
