from enum import Enum

class AppEnvTypes(Enum):
    PRODUCTION: str = 'PRODUCTION'
    DEVELOPMENT: str = 'DEVELOPMENT'
    TEST: str = 'TEST'