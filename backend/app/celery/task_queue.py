from celery import Celery
from celery.signals import celeryd_init, setup_logging

from app.core.config import settings
from app.utils.logging import configure_logging
from app.utils.sentry import init_sentry

celery_task_queue = Celery(
    "worker",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.celery.tasks.email_tasks"
    ]
)

# Connecting to this signal stops Celery replacing the root logger with its own
@setup_logging.connect
def configure_worker_logging(**kwargs):
    configure_logging()

@celeryd_init.connect
def init_worker_sentry(**kwargs):
    init_sentry()
