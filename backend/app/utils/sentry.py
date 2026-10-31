import sentry_sdk
from sentry_sdk.integrations.logging import ignore_logger_for_sentry_logs

from app.core.config import settings

def init_sentry() -> None:
    if not settings.sentry_dsn:
        return

    # One line per request - not worth spending the Sentry Logs quota on
    ignore_logger_for_sentry_logs("uvicorn.access")
    # Celery passes task arguments (emails, one time codes, reset links) as log
    # parameters, which Sentry Logs sends as attributes. Failures still arrive as errors.
    ignore_logger_for_sentry_logs("celery.app.trace")
    ignore_logger_for_sentry_logs("celery.worker.strategy")

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.app_env.value.lower(),
        send_default_pii=False,
        # Request models held in locals carry passwords, one time codes and reset tokens
        include_local_variables=False,
        enable_logs=True,
    )
