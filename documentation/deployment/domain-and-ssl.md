# Domain & SSL

The app uses two hostnames:

| Hostname | Points at | Certificate from |
|---|---|---|
| `yourdomain.com` | Netlify | Netlify, automatically |
| `api.yourdomain.com` | The droplet's reserved IP | Let's Encrypt, via Certbot on the droplet |

Netlify handles its own side with no work from you. This page is about the API subdomain, where Nginx terminates TLS in front of FastAPI.

## How the proxy works

[`reverse_proxy/production/web_server/default.conf`](../../reverse_proxy/production/web_server/default.conf) defines two server blocks:

- **Port 80** serves `/.well-known/acme-challenge/` from `/var/www/certbot` — the path Let's Encrypt fetches to verify you own the domain — and 301-redirects everything else to HTTPS.
- **Port 443** terminates TLS and proxies `/api/*` to `backend:8000`, with rate limiting at 20 req/s (burst 40) per IP and gzip on text responses.

Nothing else is served. A request to `/` on the API domain returns 404, which is correct — the frontend lives on Netlify.

> The config is **copied into the image** at build time by the [`Dockerfile`](../../reverse_proxy/production/Dockerfile). Editing it on the droplet does nothing; changes ship through a rebuild, which means a CD run.

## 1. Point DNS at the droplet

At your registrar, create an **A record**:

| Type | Name | Value |
|---|---|---|
| A | `api` | your reserved IP (`terraform output app_ip`) |

Then set up the frontend domain in Netlify: **Domain management** → **Add a domain**, and follow its instructions for the apex record. Netlify provisions the certificate for that side itself.

Wait for propagation before going further — Let's Encrypt resolves the name from its own servers, and a failed validation counts against your rate limit:

```bash
dig +short api.yourdomain.com
```

## 2. Set your domain in the Nginx config

[`default.conf`](../../reverse_proxy/production/web_server/default.conf) is committed with this boilerplate's domain in **four places** — two `server_name` lines and two certificate paths:

```nginx
server_name api.yourdomain.com;

ssl_certificate     /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;
```

Replace all four, commit, and let CD build and deploy the new image.

## 3. Issue the first certificate

There's a chicken-and-egg problem here: Nginx won't start without the certificate files, and Certbot can't get a certificate without Nginx serving the challenge on port 80.

The `certbot` service in [`docker-compose.production.yml`](../../compose/docker-compose.production.yml) only runs `certbot renew` on a loop — it does **not** handle first issuance. Break the deadlock with a throwaway self-signed certificate, then replace it with the real one.

SSH to the droplet and run:

```bash

# 1. Start the stack - Nginx now boots and serves port 80
docker compose up -d

# 2. Get the real certificate
docker compose run --rm \
  --entrypoint certbot \
  certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d $DOMAIN

# 3. Pick it up
docker compose exec reverse-proxy nginx -s reload
```

The `--entrypoint` override is required either way: the `certbot` service's own entrypoint is the renew loop, which ignores any arguments you pass it.

Step 4 prompts for an email address and the terms of service. To run it unattended, add `--email you@yourdomain.com --agree-tos --no-eff-email`.

**Use `--webroot`, not `--standalone`.** Certbot records the method in the renewal config and reuses it forever. `--standalone` binds port 80 itself, which Nginx already holds, so every future renewal would fail.

The webroot path must be `/var/www/certbot` — that's where the `certbot` service mounts its volume read-write and the `reverse-proxy` service mounts it read-only, so a challenge written by one is served by the other.

Add `--dry-run` to step 4 while you're testing. Let's Encrypt allows 5 failed validations per account per hour and 50 certificates per domain per week; dry runs don't count.

## 4. Verify

```bash
curl -I https://api.yourdomain.com/api/v1/
curl -I http://api.yourdomain.com/api/v1/         # expect 301 to https
```

## 5. Point the frontend at it

Update the proxy target in [`netlify.toml`](../../frontend/netlify.toml) to `https://api.yourdomain.com` and redeploy — see [Frontend Deployment](frontend.md#5-point-the-proxy-at-your-backend).

Also update `frontend_url` in the production configuration `app > core > settings > production.py`.

Also update `frontend_url` and `google_redirect_url` in `group_vars/vm01.yml` to the real domain, then re-run the env playbook and redeploy the backend:

```bash
ansible-playbook -i hosts.ini playbooks/environment_variables.yml
```

## How renewal works

Two independent loops, both running as long as the stack is up:

- The **certbot** container runs `certbot renew` every 12 hours. Let's Encrypt certificates last 90 days and Certbot renews at 30 days remaining, so most runs do nothing.
- The **reverse-proxy** container reloads Nginx every 6 hours ([`run.sh`](../../reverse_proxy/production/run.sh)), because Nginx holds certificates in memory and won't notice a renewed file on its own.

Nothing to schedule and no host cron. The worst case is serving a certificate up to 6 hours after renewal, which is well inside the 30-day margin.

Confirm it's healthy:

```bash
docker compose run --rm --entrypoint certbot certbot renew --dry-run
docker compose logs certbot | tail -20
```

## Things worth knowing

**Renewal breaks silently.** If validation starts failing — DNS moved, port 80 firewalled, the webroot volume unmounted — nothing alerts you, and the first symptom is browsers refusing the site 30 days later. Worth an uptime monitor on certificate expiry.

**Changing the domain means a rebuild.** The hostname is baked into the image through `default.conf`, so it can't be swapped by restarting a container or setting an env var. Edit, commit, let CD build, then repeat the issuance steps for the new name.

**`proxy_pass` uses a variable deliberately.** `set $backend_upstream http://backend:8000;` combined with `resolver 127.0.0.11` (Docker's embedded DNS) defers name resolution to request time. With a literal hostname, Nginx resolves at startup and refuses to boot if `backend` isn't up yet — so this is what lets the proxy survive the backend restarting underneath it.

**Rate limiting is per IP, applied at the proxy.** 20 req/s with a burst of 40, returning 503 beyond that. Because Netlify proxies the frontend's calls, requests arriving that way carry Netlify's egress IPs rather than the end user's — so browser traffic is pooled into a handful of addresses and can trip the limit under load. The real client IP is in `X-Forwarded-For` if you need to rate-limit on it properly.

**Certificates live in a bind mount, not a named volume.** They're at `/root/certbot/conf` on the droplet. `docker compose down -v` won't remove them, but rebuilding the droplet will — back that directory up, or plan to reissue.
