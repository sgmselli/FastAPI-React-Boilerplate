#!/bin/sh

echo "Running alembic migrations..."

alembic -c app/db/migrations/alembic.ini upgrade head

echo "Starting Fast API backend..."

exec uvicorn app.main:app --host 0.0.0.0 --port 8000