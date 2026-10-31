# Monitoring

## Logging

The backend and Celery worker log through Python's `logging` module, configured in [`app/utils/logging.py`](../../backend/app/utils/logging.py). Production writes one JSON object per line; development writes plain text.

| Level | Use for |
|---|---|
| `ERROR` / `logger.exception` | Real failures — S3, Brevo, queueing a task. These become Sentry issues |
| `WARNING` | Something odd worth investigating, but not an issue on its own |
| `INFO` | Expected outcomes — a wrong password, an expired token |

Never log emails, passwords, one time codes or tokens — log the user ID instead.

On the droplet, read logs with `docker logs backend` or `docker logs worker`. Each container keeps at most 5 × 10MB.

## Guides

1. [Sentry](sentry.md) — error tracking for the backend, worker and frontend, and searchable backend logs
