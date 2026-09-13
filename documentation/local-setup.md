# Local Setup

Everything — `reverse_proxy`, `frontend`, `backend`, `worker`, `db`, `redis` — runs via Docker Compose, as defined in [`compose/docker-compose.yml`](../compose/docker-compose.yml).

## 1. Create your `.env`

```bash
cd backend
cp .example.env .env
```

Fill in the values. The database and Redis values must match the `db`/`redis` service names in `docker-compose.yml` — not `localhost` — since containers reach each other over Docker's internal network by service name:

```
APP_ENV=DEVELOPMENT
DATABASE_NAME=boilerplatedb
DATABASE_USER=dbadmin
DATABASE_PASSWORD=password
DATABASE_HOST=db
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0
```

Fill in the remaining keys (JWT secrets, Google OAuth, bucket, Brevo) with whatever values you're using — none of them need to be real to boot the app locally, but auth/email/upload flows won't work without them.

> **`.env` is baked into the image, not mounted.** The Dockerfile does `COPY . .` at build time, so editing `.env` after the image is built has no effect until you rebuild.

## 2. Start everything

```bash
docker compose -f compose/docker-compose.yml up --build
```

No `psql` step needed here — the official `postgres` image auto-creates the `boilerplatedb` database and `dbadmin` role itself from the `POSTGRES_DB`/`POSTGRES_USER` values already set in `docker-compose.yml`'s `db` service.

- **App: [http://localhost](http://localhost)** (port 80, the reverse proxy) — use this one. It routes `/api/*` to the backend and everything else to the frontend.
- Backend directly: [http://localhost:8000](http://localhost:8000) (docs at `/docs`)

> The frontend container's own port, `3000`, serves the static files fine on its own but **isn't a working entry point** — the app calls its API via a relative `/api/v1` path, and only the reverse proxy on port 80 knows how to route that to the backend. Hitting `:3000` directly means every API call silently falls through to `index.html`.

---

Setting up a test database and running the test suite is covered separately in [Automated Testing](automated-testing.md).