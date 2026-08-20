from app.core.settings.base import BaseAppSettings

class ProductionSettings(BaseAppSettings):
    debug: bool = False
    allowed_hosts: list[str] = [] #Add all allowed hosts here
    allow_origins: list[str] = [] #Add all allowed origins here