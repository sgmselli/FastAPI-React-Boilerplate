from app.celery.task_queue import celery_task_queue
from app.services.email_services import email_service

@celery_task_queue.task(
    name="task_send_welcome_email",
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_jitter=True,
    max_retries=5,
)
def task_send_welcome_email(to_email: str, name: str):
    email_service.send_welcome_email(to_email, name)
