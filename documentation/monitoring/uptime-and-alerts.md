# Uptime & Alerts

DigitalOcean checks the API from outside the droplet and watches the droplet's resources, emailing you when something is wrong. This catches what Sentry can't — if the droplet, Nginx or the database is down, nothing is running to report an error.

## Health endpoint

`GET /api/v1/health` checks the dependencies every request relies on, each with a 2 second timeout:

| Check | How |
|---|---|
| Postgres | `SELECT 1` |
| Redis | `PING` |

It returns `200 {"status": "ok"}`, or `503` naming what failed:

```json
{"status": "error", "database": "ok", "redis": "unavailable"}
```

External services (S3, Brevo) aren't checked — their outages aren't yours, and their errors already reach Sentry. Logic lives in [`app/utils/health.py`](../../backend/app/utils/health.py).

## Alerts

Declared in [`monitoring.tf`](../../infrastructure/terraform/monitoring.tf). Every alert emails `alert_email`.

| Alert | Fires when |
|---|---|
| Down | The health check fails from all four regions for 2 minutes |
| Slow | Responses take over 2 seconds for 5 minutes |
| SSL expiry | The certificate expires in under 14 days — certbot renews at 30, so this means renewal has broken |
| CPU | Above 80% for 10 minutes |
| Memory | Above 90% for 10 minutes |
| Disk | Above 80% for 5 minutes |

## Setup

1. Deploy the backend first and check `https://api.<your-domain>/api/v1/health` returns `{"status":"ok"}`. Applying before it exists triggers the down alert straight away.
2. Add to `infrastructure/terraform/terraform.tfvars`:

   ```hcl
   alert_email      = "you@example.com"
   health_check_url = "https://api.<your-domain>/api/v1/health"
   ```

   The email must belong to a member of your DigitalOcean team, or alerts won't be delivered.

3. From `infrastructure/terraform`:

   ```bash
   terraform plan    # expect 7 to add, nothing changed or destroyed
   terraform apply
   ```

4. In the DigitalOcean control panel, check the check shows as up under **Monitoring → Uptime** and the policies under **Monitoring → Alerts**.

## When an alert fires

| Alert | First look |
|---|---|
| Down | `curl` the health URL. A `503` names the failing dependency; no response means the droplet, Nginx or DNS — `docker ps` on the droplet |
| Slow | Sentry for errors, `docker stats` for a container under load |
| SSL expiry | `docker logs certbot` for renewal errors |
| CPU / Memory | `docker stats` to find the container |
| Disk | `df -h`, then `docker system df` — old images are the usual cause (`docker image prune`) |
