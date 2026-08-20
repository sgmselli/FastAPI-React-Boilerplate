from app.enums.environments import AppEnvTypes
from app.core.settings.base import BaseAppSettings
from app.core.settings.development import DevelopmentSettings
from app.core.settings.production import ProductionSettings
from app.core.settings.test import TestSettings

environments: dict[AppEnvTypes, type[BaseAppSettings]] = {
    AppEnvTypes.PRODUCTION: ProductionSettings,
    AppEnvTypes.DEVELOPMENT: DevelopmentSettings,
    AppEnvTypes.TEST: TestSettings,
}

def get_app_settings() -> BaseAppSettings:
    app_env = BaseAppSettings().app_env
    environment_settings = environments[app_env]
    return environment_settings()

settings = get_app_settings()
