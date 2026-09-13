# Tech Stack

## Backend — FastAPI

Python 3.12, [FastAPI](https://fastapi.tiangolo.com/) served by [Uvicorn](https://www.uvicorn.org/).

| | |
|---|---|
| Framework | FastAPI 0.120 |
| Server | Uvicorn 0.38 |
| ORM | SQLAlchemy 2.0 (async) with asyncpg |
| Migrations | Alembic 1.17 |
| Validation | Pydantic 2.12 + pydantic-settings |
| Auth | python-jose (JWT), passlib + bcrypt (hashing), Authlib (Google OAuth) |
| Background jobs | Celery 5.6 with Redis as broker |
| Tests | pytest + pytest-asyncio |

Source lives in `backend/app/`, organised by responsibility — `router/` for endpoints, `services/` for business logic, `models/` for SQLAlchemy tables, `schema/` for Pydantic request/response models, `auth/` for JWT and password handling.

Config is environment-driven: `APP_ENV` selects a settings class (`DevelopmentSettings`, `ProductionSettings`, `TestSettings`) in `app/core/settings/`, each overriding the shared defaults in `base.py`.

## Frontend — React + Vite

TypeScript 5.9, [React](https://react.dev/) 19, built by [Vite](https://vite.dev/) 7.

| | |
|---|---|
| UI | React 19 + react-dom |
| Routing | React Router 7 |
| HTTP | axios |
| Styling | Tailwind CSS 4 + daisyUI |
| Build | Vite 7 |
| Unit tests | Vitest + React Testing Library + MSW |
| E2E tests | Playwright |
| Linting | ESLint 9 |

Source lives in `frontend/src/` — `pages/` for routed views, `components/` for shared UI, `contexts/` for React context (auth state), `api/` for the axios layer, `hooks/` and `utils/` for the rest.

The API client uses a **relative** base URL (`/api/v1`), so the frontend never needs to know the backend's address — the reverse proxy routes it. Auth tokens are httpOnly cookies rather than localStorage, which is why every axios instance sets `withCredentials: true`.

## Database — PostgreSQL

PostgreSQL 18, accessed asynchronously via SQLAlchemy + asyncpg.

Schema changes are managed by Alembic; migrations live in `backend/app/db/migrations/versions/` and are applied automatically on container start by `backend/run.sh`.

A single Postgres instance hosts two databases: `boilerplatedb` for the app and `boilerplatetestdb` for the test suite — see [Automated Testing](automated-testing.md).

## Cache & queue — Redis

Redis 7 serves as the Celery broker and is available for caching. The `worker` service in Docker Compose runs Celery against the same backend image, just with a different command — one image, no drift between API and worker code.

## Containerisation — Docker

Everything runs through Docker Compose in development. `compose/docker-compose.yml` defines six services:

| Service | Purpose |
|---|---|
| `reverse_proxy` | nginx on port 80 — the entry point. Routes `/api/*` to the backend, everything else to the frontend |
| `frontend` | React app built to static files, served by nginx |
| `backend` | FastAPI via Uvicorn |
| `worker` | Celery worker (same image as `backend`) |
| `db` | PostgreSQL 18 |
| `redis` | Redis 7 |

The reverse proxy matters more than it looks: because the frontend calls `/api/v1` relatively, **port 80 is the only working entry point**. Hitting the frontend container's port directly serves the page but breaks every API call.