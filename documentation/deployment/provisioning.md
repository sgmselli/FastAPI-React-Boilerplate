# Server Provisioning

Terraform gives you a bare Ubuntu box. Ansible turns it into something that can run the app: Docker installed, and the production environment files written to `/root`. Both are one-off steps — once done, deploys are just image pulls.

The playbooks live in [`infrastructure/ansible/`](../../infrastructure/ansible/) and run from your machine over SSH.

| Playbook | What it does |
|---|---|
| [`provision.yml`](../../infrastructure/ansible/playbooks/provision.yml) | Updates apt, installs Docker Engine, CLI, Buildx and the Compose plugin, enables the service |
| [`environment_variables.yml`](../../infrastructure/ansible/playbooks/environment_variables.yml) | Writes `/root/.env.backend` and `/root/.env.db` from your variables |
| [`deploy.yml`](../../infrastructure/ansible/playbooks/deploy.yml) | Pulls images and starts the stack — covered in [CI/CD Pipelines](ci-cd.md) |

## 1. Install Ansible

```bash
brew install ansible                              # macOS
ansible-galaxy collection install community.docker
```

The collection is only needed by `deploy.yml`, but installing it now saves a confusing failure later.

## 2. Point the inventory at your droplet

[`hosts.ini`](../../infrastructure/ansible/hosts.ini) is committed with a previous deployment's IP address, so it will be wrong for you. Replace it with the `ansible_inventory_line` output from [Infrastructure](infrastructure.md):

```ini
[vm01]
<your-reserved-ip> ansible_user=root ansible_ssh_private_key_file=~/.ssh/id_ed25519
```

Check Ansible can reach it before running anything that changes state:

```bash
cd infrastructure/ansible
ansible -i hosts.ini vm01 -m ping
```

A `SUCCESS` with `"ping": "pong"` means SSH, the key path, and the inventory are all correct. If you get a host key prompt, accept it once so later runs aren't blocked.

## 3. Create `group_vars/vm01.yml`

**This file is gitignored and there is no example to copy** — you have to write it yourself. It holds every production secret, and [`environment_variables.yml`](../../infrastructure/ansible/playbooks/environment_variables.yml) fails with `undefined variable` if any key is missing.

Create `infrastructure/ansible/group_vars/vm01.yml`:

```yaml
---
app_env: PRODUCTION
frontend_url: https://yourdomain.com

database_name: yourdb
database_user: dbadmin
database_password: <a long random string>
database_host: db

bucket_secret_key: <from your S3-compatible provider>
bucket_access_key_id: <from your S3-compatible provider>
bucket_name: your-bucket
bucket_region: lon1
bucket_endpoint_url: https://lon1.digitaloceanspaces.com

access_secret_key: <random 32+ bytes>
refresh_secret_key: <random 32+ bytes, different from the above>
session_secret_key: <random 32+ bytes, different again>

google_client_id: <from Google Cloud Console>
google_client_secret: <from Google Cloud Console>
google_redirect_url: https://yourdomain.com/api/v1/auth/google/callback

redis_host: redis
redis_port: 6379
redis_db: 0

brevo_api_key: <from Brevo>
from_email: noreply@yourdomain.com
```

> **`database_host` must be `db` and `redis_host` must be `redis`.** These are Docker Compose service names, not hostnames — containers reach each other by service name on the internal network. `localhost` resolves to the container itself and fails.

Generate the three secret keys with:

```bash
openssl rand -hex 32
```

Use a different value for each. `SESSION_SECRET_KEY` isn't optional even if you're not using Google sign-in — the Starlette session middleware in [`main.py`](../../backend/app/main.py) needs it to boot.

The Google credentials come from [Google OAuth](../google-oauth.md); Brevo and the bucket keys from whichever providers you're using. Blank values will boot the app but break those features.

> **`google_redirect_url` must be registered in the Google Cloud Console**, byte for byte, as an authorised redirect URI — and `frontend_url` is where the backend sends the browser after a successful sign-in. Both use your production domain, so if you haven't set up DNS yet ([Domain & SSL](domain-and-ssl.md)), fill them in now and re-run this playbook once the domain resolves.

## 4. Install Docker

```bash
ansible-playbook -i hosts.ini playbooks/provision.yml
```

Takes a few minutes, mostly the `apt upgrade`. The last two tasks verify `docker --version` and `docker compose version`, so a clean run is proof Docker is working.

Re-running is safe — every task is idempotent, and a second run should report `changed=0` apart from the apt cache.

## 5. Write the environment files

```bash
ansible-playbook -i hosts.ini playbooks/environment_variables.yml
```

This renders `group_vars/vm01.yml` into two files on the droplet:

- **`/root/.env.backend`** — read by the `backend` and `worker` services
- **`/root/.env.db`** — read by `db`, as `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD`

Both are consumed via `env_file` in [`docker-compose.production.yml`](../../compose/docker-compose.production.yml), so unlike local development **these are not baked into the image** — changing a secret means re-running this playbook and restarting the containers, not rebuilding.

Verify:

```bash
ssh root@<your-reserved-ip> "ls -l /root/.env.*"
```

## 6. Check the registry reference

[`docker-compose.production.yml`](../../compose/docker-compose.production.yml) hardcodes the image paths:

```yaml
image: registry.digitalocean.com/fastapi-react-cr/app:backend-latest
```

If your `registry_name` in `terraform.tfvars` isn't `fastapi-react-cr`, **edit all three occurrences** in that file before deploying, or the droplet will try to pull from a registry you don't own.

## What you should have now

A droplet with Docker installed, two env files in `/root`, and nothing running yet. Starting the stack is the deploy step — see [CI/CD Pipelines](ci-cd.md), or run it by hand:

```bash
ansible-playbook -i hosts.ini playbooks/deploy.yml
```

That needs `DIGITALOCEAN_ACCESS_TOKEN` exported in your shell, since the playbook reads it via `lookup('env', ...)` to log in to the registry.

## Things worth knowing

**`group_vars/vm01.yml` is the single point of failure for secrets.** It's plaintext, gitignored, and exists only on your machine — lose it and you'll be reconstructing every production credential by hand. Back it up somewhere safe, or move to [Ansible Vault](https://docs.ansible.com/ansible/latest/vault_guide/index.html) and commit the encrypted version.

**Everything runs as `root`.** The inventory connects as root and the playbooks use `become: yes` on top of that. It's the DigitalOcean default and it keeps things simple, but a non-root deploy user with sudo would be the safer arrangement.

**Postgres isn't reachable from outside the droplet.** The `db` service publishes no host port — the backend and worker reach it by service name on the internal `backend` network, and that's the only route in. To inspect the database you have to go through the droplet:

```bash
ssh root@<your-reserved-ip>
docker exec -it db psql -U <database_user> -d <database_name>
```
