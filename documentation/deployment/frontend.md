# Frontend Deployment

The frontend is a static Vite build hosted on Netlify. It never runs on the droplet — Netlify serves the files, and proxies anything under `/api` through to the backend.

Deploys are pushed by GitHub Actions, not by Netlify. [`_deploy-netlify.yml`](../../.github/workflows/_deploy-netlify.yml) runs `npm run build` on a runner and ships `dist/` with `netlify-cli deploy --prod --no-build`, so **Netlify never builds anything itself**. That's why the site doesn't need to be connected to the repository.

## How the app reaches the API

Worth understanding before configuring anything, because it's the reason there's no API URL to set.

[`src/api/index.ts`](../../frontend/src/api/index.ts) hardcodes a relative base URL:

```ts
const BASE_URL = "/api/v1";
```

So the browser always calls the site's own origin. Getting those calls to the backend is [`netlify.toml`](../../frontend/netlify.toml)'s job:

```toml
[[redirects]]
  from = "/api/*"
  to = "https://api.yourdomain.com/api/:splat"
  status = 200
  force = true
```

`status = 200` makes this a **proxy, not a redirect** — Netlify fetches the backend response server-side and returns it as its own. The browser never learns the backend exists.

Two useful consequences: the backend needs no CORS configuration, and the httpOnly auth cookies are first-party, so `withCredentials: true` works without any `SameSite=None` arrangement. Swapping this for a cross-origin `VITE_API_URL` would break both.

`force = true` makes the `/api` rule win over the SPA fallback below it, which would otherwise swallow those paths into `index.html`.

## 1. Create a Netlify site

1. Sign up at [app.netlify.com](https://app.netlify.com/).
2. **Add new site** → **Deploy manually**, and drop any placeholder folder in. This creates an empty site without linking the repository.

> **Don't connect the repo.** If Netlify builds on push *and* CD deploys via the CLI, every merge deploys twice and the two can land out of order. The CLI is the only thing that should publish.

## 2. Get the Site ID

**Site configuration** → **General** → **Site details**. Copy the **Site ID** (labelled *API ID* in some views) — a UUID, not the `something-something-123456.netlify.app` name.

## 3. Create an access token

**User settings** → **Applications** → **Personal access tokens** → **New access token**. Copy it now; it isn't shown again.

## 4. Add both to GitHub

```bash
gh secret set NETLIFY_SITE_ID --body "<the uuid>"
gh secret set NETLIFY_AUTH_TOKEN --body "<the token>"
```

Set them at repository level — see [Secrets & Variables](secrets.md#scope-repository-not-environment).

## 5. Point the proxy at your backend

[`netlify.toml`](../../frontend/netlify.toml) is committed with **this boilerplate's own API domain**:

```toml
to = "https://api.fastapireactboilerplate.com/api/:splat"
```

Change it to yours, or every API call in your deployed app will hit someone else's server. The domain must be live and serving HTTPS first — see [Domain & SSL](domain-and-ssl.md).

This is a committed file, not a secret, so the change goes in via a normal commit.

## 6. Deploy

Merging to `main` with changes under `frontend/**` triggers it. To deploy without a code change, use **Actions** → **CD** → **Run workflow** and tick `deploy_frontend`.

Check the Netlify dashboard's **Deploys** tab for the result, then load the site and confirm a request to `/api/v1/...` returns JSON rather than HTML. Getting `index.html` back means the `/api` rule isn't matching — check `force = true` is present and that the rule comes before the SPA fallback.

## What `netlify.toml` sets up

Beyond the API proxy, the committed config handles two things you'd otherwise hit in production:

**SPA fallback.** Everything not matched falls through to `index.html`, so deep-linking or refreshing on a `react-router-dom` route doesn't 404.

**Cache headers.** `/assets/*` is cached forever (`immutable`) because Vite fingerprints those filenames; `index.html` is `no-cache` because it isn't fingerprinted and holds the references to the hashed files. Reverse the two and users get a stale app pinned to deleted assets.

## Things worth knowing

**Netlify keeps every deploy, so rollback is instant.** **Deploys** → pick a previous one → **Publish deploy**. This is the only part of the stack with a real rollback story — the backend overwrites its `latest` image tag, as covered in [CI/CD Pipelines](ci-cd.md#rolling-back).

**A failing frontend test still deploys.** The `deploy-frontend` job in [`cd.yml`](../../.github/workflows/cd.yml) doesn't check the test result. Details in [CI/CD Pipelines](ci-cd.md#things-worth-knowing).

**The build takes no environment variables.** There's no `import.meta.env` usage anywhere in the app and no `.env` files under `frontend/`. Everything environment-specific lives in `netlify.toml`.

**Local development uses a different mechanism.** [`vite.config.ts`](../../frontend/vite.config.ts) proxies `/api` to `http://localhost:80` — the Compose reverse proxy — so the same relative URLs work in dev without Netlify. Overridable with `API_URL`. Nothing in `netlify.toml` applies locally.

**The backend is publicly reachable too.** Proxying through Netlify hides it from the browser, but `api.yourdomain.com` still answers directly to anyone who asks. The proxy is for cookie and CORS convenience, not access control.
