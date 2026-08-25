from app.core.settings.base import BaseAppSettings

class ProductionSettings(BaseAppSettings):
    debug: bool = False
    frontend_url: str = "https://fastapireactboilerplate.com"
    allowed_hosts: list[str] = ["fastapireactboilerplate.com", "api.fastapireactboilerplate.com"]
    allow_origins: list[str] = ["https://fastapireactboilerplate.com"]
    google_redirect_url: str = "https://fastapireactboilerplate.com/api/v1/auth/google/callback"
