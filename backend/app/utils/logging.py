import json
import logging
import logging.config
from datetime import datetime, timezone

from app.core.config import settings

class JsonFormatter(logging.Formatter):
    """
    Formats each record as a single line of JSON, so log tooling can filter on fields
    """

    def format(self, record: logging.LogRecord) -> str:
        log = {
            "timestamp": datetime.fromtimestamp(record.created, timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            log["exception"] = self.formatException(record.exc_info)
        return json.dumps(log)

class ExcludeHealthChecks(logging.Filter):
    """
    Drops access log lines for the health endpoint, which the uptime check calls several times a minute
    """

    def filter(self, record: logging.LogRecord) -> bool:
        # Uvicorn's access log args are (client, method, path, http_version, status)
        if isinstance(record.args, tuple) and len(record.args) >= 3:
            return not str(record.args[2]).startswith(f"{settings.api_v1_prefix}/health")
        return True

def configure_logging() -> None:
    formatter = "json" if settings.is_production() else "text"

    logging.config.dictConfig({
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "text": {"format": "%(asctime)s %(levelname)s [%(name)s] %(message)s"},
            "json": {"()": JsonFormatter},
        },
        "filters": {
            "exclude_health_checks": {"()": ExcludeHealthChecks},
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": formatter,
                "stream": "ext://sys.stdout",
            },
        },
        "root": {"level": "INFO", "handlers": ["console"]},
        "loggers": {
            "app": {"level": settings.log_level},
            # Uvicorn installs its own handlers before the app is imported - strip them
            # so its logs go through the root handler in the same format
            "uvicorn": {"handlers": [], "propagate": True},
            "uvicorn.error": {"handlers": [], "propagate": True},
            "uvicorn.access": {"handlers": [], "propagate": True, "filters": ["exclude_health_checks"]},
        },
    })
