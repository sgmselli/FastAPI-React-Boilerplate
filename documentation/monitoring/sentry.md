# Sentry

[Sentry](https://sentry.io) collects errors, with stack traces, from the backend, Celery worker and frontend, and stores the backend's logs. It is off unless a DSN is set, so local runs, tests and CI send nothing.

| | Backend and worker | Frontend |
|---|---|---|
| **Errors** | Unhandled exceptions, 5xx responses, `logger.error` / `logger.exception`, failed Celery tasks | Uncaught errors, unhandled promise rejections, render crashes |
| **Logs** | `INFO` and above, except Uvicorn access logs and Celery task logs | - |
| **Never sent** | Request bodies, cookies, IP addresses, local variables, Celery task arguments | Request bodies, cookies, headers, user info, URL query strings and fragments |

Configured in [`app/utils/sentry.py`](../../backend/app/utils/sentry.py), [`src/utils/sentry.ts`](../../frontend/src/utils/sentry.ts) and [`vite.config.ts`](../../frontend/vite.config.ts).

## 1. Create the projects

1. Sign up at [sentry.io](https://sentry.io) and create an organisation. Pick the **EU** data region if GDPR applies — it can't be changed later.
2. Create two projects:
   - **FastAPI** for the backend — select *Error monitoring* and *Logging*
   - **React** for the frontend — select *Error monitoring*
3. For each, copy the DSN from **Settings → Projects → (project) → Client Keys (DSN)**.

## 2. Backend

Add the backend DSN to `infrastructure/ansible/group_vars/vm01.yml`:

```yaml
sentry_dsn: "https://<key>@o<id>.ingest.de.sentry.io/<id>"
```

Then, from `infrastructure/ansible`, write it to the droplet and restart the containers:

```bash
ansible-playbook -i hosts.ini playbooks/environment_variables.yml
ansible-playbook -i hosts.ini playbooks/deploy.yml
```

## 3. Frontend

1. Create a token under **Settings → Developer Settings → Organization Tokens**. Copy it — it's only shown once.
2. In GitHub, add these under **Settings → Secrets and variables → Actions**:

   | Name | Type | Value |
   |---|---|---|
   | `SENTRY_AUTH_TOKEN` | Secret | The organisation token |
   | `SENTRY_ORG` | Variable | Organisation slug |
   | `SENTRY_PROJECT_FRONTEND` | Variable | React project slug |
   | `SENTRY_DSN_FRONTEND` | Variable | React project DSN |

3. In the React project, set **Settings → Security & Privacy → Allowed Domains** to your domain. The DSN ships in the public bundle, so this stops other sites sending events with it.

The next frontend deploy uploads source maps to Sentry and deletes them before publishing, so stack traces show the original `.tsx` files without exposing your source.

> Only variables prefixed `VITE_` reach the browser. Never give a secret that prefix.

## 4. Check it works

- **Frontend** — on the live site, run `setTimeout(() => { throw new Error("Sentry test") })` in the browser console. The issue should show `.tsx` file names.
- **Backend** — on the droplet:

  ```bash
  docker exec backend python -c "import sentry_sdk; from app.utils.sentry import init_sentry; init_sentry(); sentry_sdk.capture_message('Sentry test'); sentry_sdk.flush()"
  ```

If nothing arrives, check the GitHub variable names match exactly, and look for `[sentry-vite-plugin]` errors in the deploy log. Both fail silently rather than breaking the deploy.

## Optional: link stack traces to GitHub

Under **Settings → Integrations → GitHub**, connect the repo (selected repositories only), then add a code mapping per project:

| Project | Stack trace root | Source code root |
|---|---|---|
| Backend | `/backend/` | `backend/` |
| Frontend | The path shown in a real error | `frontend/` |

## Testing locally

Set `SENTRY_DSN` in `backend/.env` and/or `VITE_SENTRY_DSN` in `frontend/.env.local`, then rebuild with `docker compose -f compose/docker-compose.yml up --build`. Events are tagged `development`. Remove the DSNs when you're done.
