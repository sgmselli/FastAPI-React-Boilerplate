# CI/CD Pipelines

Two things happen automatically: **pull requests get tested**, and **merges to `main` get deployed**. Both live in [`.github/workflows/`](../../.github/workflows/).

Workflows prefixed with `_` are reusable — they're never triggered directly, only called by one of the top-level workflows. That keeps the trigger logic and the actual work separate.

| Workflow | Trigger | Calls |
|---|---|---|
| [`ci-backend.yml`](../../.github/workflows/ci-backend.yml) | PR to `main` | `_test-backend.yml` |
| [`ci-frontend.yml`](../../.github/workflows/ci-frontend.yml) | PR to `main` | `_test-frontend.yml` |
| [`ci-e2e.yml`](../../.github/workflows/ci-e2e.yml) | PR to `main` | `_e2e.yml` |
| [`cd.yml`](../../.github/workflows/cd.yml) | Push to `main`, or manual | `_test-*`, `_build-push.yml`, `_deploy-droplet.yml`, `_deploy-netlify.yml` |

## CI — on every pull request

All three CI workflows follow the same shape: a `changes` job decides whether anything relevant was touched, and the real job runs only if it was. Nothing runs on a **draft** PR — every `changes` job is gated on `github.event.pull_request.draft == false`.

Each also sets `cancel-in-progress: true`, so pushing a new commit kills the previous run rather than queueing behind it.

**[`_test-backend.yml`](../../.github/workflows/_test-backend.yml)** spins up `postgres:18` and `redis:7-alpine` as service containers, points the app at them via `localhost`, runs Alembic migrations, then `pytest`. Because the services are real, both the unit and integration suites run here.

**[`_test-frontend.yml`](../../.github/workflows/_test-frontend.yml)** runs lint, `tsc -b --noEmit`, the Vitest suite, and then a production `npm run build`. That last step matters — it's the same build [`_deploy-netlify.yml`](../../.github/workflows/_deploy-netlify.yml) ships, so a build break is caught on the PR rather than at deploy time.

**[`_e2e.yml`](../../.github/workflows/_e2e.yml)** brings up the full local Compose stack, waits for the API and Postgres, migrates, then runs Playwright against it with `--workers=1`. On failure it uploads the Playwright report as an artifact, kept for 7 days — download it from the run summary rather than trying to read the log.

Dependency installation is shared via two composite actions, [`setup-backend`](../../.github/actions/setup-backend/action.yml) (Python 3.12, pip cache) and [`setup-frontend`](../../.github/actions/setup-frontend/action.yml) (Node 24, npm cache).

## CD — on every push to `main`

[`cd.yml`](../../.github/workflows/cd.yml) runs this sequence, skipping whatever isn't relevant:

1. **`changes`** — did `backend/**`, `compose/**`, or `frontend/**` change?
2. **`test-backend`** / **`test-frontend`** — the same reusable workflows CI uses.
3. **`build-push`** — builds the `backend` and `reverse-proxy` images for `linux/amd64` and pushes them to the DigitalOcean registry. Only runs if the backend changed *and* its tests passed.
4. **`deploy-backend`** — runs [`deploy.yml`](../../infrastructure/ansible/playbooks/deploy.yml) over SSH: copies the production Compose file to `/root`, logs in to the registry, and pulls and restarts the stack.
5. **`deploy-frontend`** — builds the frontend and ships `dist/` to Netlify with `netlify-cli deploy --prod`.

A frontend-only change skips steps 3 and 4 entirely; a backend-only change skips step 5.

The whole workflow uses a `cd-main` concurrency group with **`cancel-in-progress: false`**. Two merges in quick succession queue rather than race, so a deploy part-way through touching the droplet always finishes.

## Deploying manually

CD also accepts `workflow_dispatch` with two toggles, for when you need to redeploy without a code change:

**Actions** → **CD** → **Run workflow** → tick `deploy_backend` and/or `deploy_frontend`.

These force the relevant path to run even though `paths-filter` found no changes — useful after editing `group_vars` and re-running the env playbook, or to recover from a failed deploy.

## Rolling back

There isn't a clean rollback path today. [`_build-push.yml`](../../.github/workflows/_build-push.yml) tags every image `:backend-latest` and `:reverse-proxy-latest`, so each build **overwrites** the previous one and there's no older tag left in the registry to pull.

To undo a bad backend deploy, revert the commit on `main` and let CD rebuild:

```bash
git revert <bad-sha>
git push origin main
```

The frontend is better off — Netlify keeps every deploy, so you can roll back instantly from its dashboard.

If rollback speed matters, tag images with `${{ github.sha }}` in addition to `latest`. The plumbing for passing a specific tag through to the deploy step has been removed, so this means changing [`_build-push.yml`](../../.github/workflows/_build-push.yml), [`_deploy-droplet.yml`](../../.github/workflows/_deploy-droplet.yml) and [`docker-compose.production.yml`](../../compose/docker-compose.production.yml) together.

## Things worth knowing

**A failing frontend test does not stop the frontend deploying.** The `deploy-frontend` job is gated on `always() && needs.deploy-backend.result != 'failure'` — it never checks `test-frontend`. Because `always()` overrides the normal rule that a failed dependency blocks a job, a red Vitest or lint run still ships to production. The backend path doesn't have this hole: `build-push` explicitly requires `needs.test-backend.result == 'success'`. Worth fixing by adding the same check.

**E2E tests never run on `main`.** [`ci-e2e.yml`](../../.github/workflows/ci-e2e.yml) only triggers on pull requests, and [`cd.yml`](../../.github/workflows/cd.yml) doesn't call `_e2e.yml`. Anything merged without passing through a PR — a direct push, or an admin override — reaches production with no end-to-end coverage.

**The backend has no lint or typecheck step.** It's stubbed out in [`_test-backend.yml`](../../.github/workflows/_test-backend.yml) with a comment, because neither ruff nor mypy is in `requirements.txt`. The frontend does lint and typecheck, so the two sides aren't held to the same standard.

**Path filtering and required status checks interact badly.** If you make `Backend tests` a required check in branch protection, a frontend-only PR will sit forever waiting for a job that was deliberately skipped. Either require only the `changes` jobs, or add a job that always reports success.

**Deploys restart the stack, they don't migrate the database.** [`deploy.yml`](../../infrastructure/ansible/playbooks/deploy.yml) pulls images and calls `docker compose up` — there's no `alembic upgrade head` anywhere in CD, though both CI workflows run one. A deploy carrying a new migration needs it applied by hand:

```bash
ssh root@<your-reserved-ip>
docker exec -it backend alembic -c app/db/migrations/alembic.ini upgrade head
```
