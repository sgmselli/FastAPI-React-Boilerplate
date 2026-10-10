from celery import Celery

from app.core.config import settings

celery_task_queue = Celery(
    "worker",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.celery.tasks.email_tasks"
    ]
)
