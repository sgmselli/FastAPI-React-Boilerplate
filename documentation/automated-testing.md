# Automated Testing

Three layers of tests exist across the project:

- **Unit**
- **Integration**
- **End to End**

---

## Backend

**Technologies:** [pytest](https://docs.pytest.org/)

Tests live under `backend/tests/`

### Unit tests — `tests/unit/`

```bash
cd backend
venv/bin/pytest tests/unit
```

### Integration tests — `tests/integration/`

```bash
cd backend
venv/bin/pytest tests/integration
```

### How `TestSettings` picks a database host

`TestSettings` ([`backend/app/core/settings/test.py`](../backend/app/core/settings/test.py)) needs to resolve to a *different* host depending on whether pytest runs inside a container or on your machine, without editing anything by hand each time. Three layers make that automatic, checked in this order:

1. **Real environment variables** — e.g. `-e DATABASE_HOST=db` on a `docker compose run`.
2. **`backend/.env.test`** — read via `env_file='.env.test'` in the class config. Not committed (see `.example.env.test` for the template); create your own with `cp .example.env.test .env.test`. Points at `localhost`, for running pytest directly on your machine.
3. **Class defaults in `test.py`** — `db` / `redis`, the Docker Compose service names.

`backend/.dockerignore` excludes both `.env` and `.env.test` from the build context, so **the image never contains `.env.test`** — a containerized run falls straight through to the class defaults (`db`) without needing to know your local file exists at all. This is also why `.env` (the real dev secrets) isn't in the image either.

### Testing with Docker

The `db` service hosts **two** databases: `boilerplatedb` for the app, and `boilerplatetestdb` for tests. Both live in the same Postgres instance — no second service, no extra port. Containers each have their own network namespace, so nothing needs republishing.

```bash
docker compose -f compose/docker-compose.yml run --rm --build -e DATABASE_HOST=db backend pytest
```

The `-e DATABASE_HOST=db` flag is belt-and-braces: env vars outrank `.env.test` regardless of whether that file made it into the image, so this works whether or not `.dockerignore` is doing its job correctly. Database name, user, and password already match between the class defaults and the `db` service.

`--build` matters: the Dockerfile copies the source in at build time and there's no volume mount, so without it you'd be running whatever code was baked into the image last time. If you're iterating on tests, [running without Docker](#testing-without-docker) is the faster loop.

> **The test database is only created when the Postgres data directory is empty.** The init script at `compose/initdb/01-create-test-db.sql` runs via the official image's `docker-entrypoint-initdb.d` hook, which fires on *first* initialisation only. If your `db` volume already has data, the script won't have run — you'll need `docker compose -f compose/docker-compose.yml down -v` to wipe it and start fresh, **which also destroys everything in `boilerplatedb`**. Alternatively, create it by hand once with the `psql` commands in the next section.

### Testing without Docker

Integration tests connect to a **local** Postgres at `localhost:5432` — not the Docker `db` service from [Local Setup](local-setup.md).

> **Port conflict:** Docker's `db` service also publishes Postgres on `5432`. If it's running at the same time as a local Postgres install, only one can hold that port — stop one before starting the other.

**1. Create `backend/.env.test`:**

```bash
cd backend
cp .example.env.test .env.test
```

The template already points `DATABASE_HOST` at `localhost` — that's what makes the local run resolve differently from the Docker one described above.

**2. Create the test database and role:**

```bash
psql -h localhost -d postgres -c "CREATE ROLE testdbadmin LOGIN PASSWORD 'password';"
psql -h localhost -d postgres -c "CREATE DATABASE boilerplatetestdb OWNER testdbadmin;"
```

**3. Run the tests:**

```bash
cd backend
venv/bin/pytest tests/unit          # no database needed
venv/bin/pytest tests/integration   # needs the test database above
venv/bin/pytest                     # both
```

Migrations are applied to the test database automatically by a session-scoped fixture before integration tests run — there's no separate migration step to remember, and no need to re-run it when a new migration is added.

---

## Frontend

**Technologies:** [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/react) + [MSW](https://mswjs.io/) (unit/component), [Playwright](https://playwright.dev/) (E2E).

Vitest rather than Jest because this is a Vite project — it reuses `vite.config.ts`, so the TypeScript transform, path resolution, and `import.meta.env` all behave identically to the app build with no duplicated config.

### Unit and component tests

Test files are **colocated** with the code they cover — `Login.test.tsx` sits beside `Login.tsx`. This is the prevailing React convention: tests travel with the file through refactors, and there's no parallel tree to keep in sync. (The backend uses a mirrored `tests/` tree instead — different ecosystems, different norms.)

```bash
cd frontend
npm test              # single run
npm run test:watch    # watch mode
```

No database or running server needed.

**Network calls are intercepted by MSW**, not by stubbing the API modules. That matters most for the token-refresh interceptor in `src/api/index.ts` — mocking `api/user` directly would bypass it entirely, leaving the trickiest logic in the frontend untested. Handlers live in `src/test/handlers.ts` and default to a signed-in happy path; individual tests override per-case with `server.use(...)`.

Shared helpers:

| File | Purpose |
|---|---|
| `src/test/setup.ts` | jest-dom matchers, MSW server lifecycle. Unhandled requests **error** rather than passing through |
| `src/test/handlers.ts` | Default MSW handlers + the shared `testUser` |
| `src/test/renderWithProviders.tsx` | Renders inside `MemoryRouter` + `AuthProvider`; `route` sets the starting location, `withAuth: false` skips the auth provider |

### E2E tests — `tests/e2e/`

**These run against the real stack** — reverse proxy, backend, Postgres — so it has to be up first:

```bash
# terminal 1 - leave running
docker compose -f compose/docker-compose.yml up --build

# terminal 2
cd frontend
npx playwright install chromium   # one-time, downloads the browser
npm run test:e2e
```

`playwright.config.ts` targets `http://localhost:80`, the reverse proxy, since that's the only entry point where `/api/*` routes correctly (see [Local Setup](local-setup.md)). Only Chromium is enabled; other browsers are stubbed out but commented off. `workers: 1` and `retries: 0` — specs run serially and a failure is a failure, not something retried away.

Useful while debugging:

```bash
npm run test:e2e -- --headed        # watch the browser drive
npm run test:e2e -- --debug         # step through with the inspector
npm run test:e2e -- --grep "sign in"  # filter by test name
npx playwright show-report          # HTML report from the last run
```

> Because the compose stack runs `APP_ENV=DEVELOPMENT`, local E2E runs create real users in `boilerplatedb`. Harmless and ephemeral in CI, but it accumulates on your machine over time.