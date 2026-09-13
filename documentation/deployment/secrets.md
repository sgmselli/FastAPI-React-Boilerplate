# Secrets & Variables

Credentials are spread across three stores, and it's easy to set one and forget the others. Nothing sensitive is ever committed — all three locations are either gitignored or held by GitHub.

| Store | Holds | Used by |
|---|---|---|
| `infrastructure/terraform/terraform.tfvars` | DigitalOcean token, SSH public key, registry name | Terraform, when you run it locally |
| `infrastructure/ansible/group_vars/vm01.yml` | Every application secret — database, JWT keys, OAuth, bucket, Brevo | Ansible, rendered into `/root/.env.*` on the droplet |
| GitHub Actions secrets and variables | DigitalOcean token and SSH private key, Netlify credentials | CD, on every push to `main` |

The first two are covered in [Infrastructure](infrastructure.md) and [Server Provisioning](provisioning.md). This page is the GitHub half.

## Secrets

**Settings** → **Secrets and variables** → **Actions** → **Secrets** tab → **New repository secret**.

| Name | Value | Used by |
|---|---|---|
| `DIGITALOCEAN_ACCESS_TOKEN` | The personal access token from [DigitalOcean Account Setup](digital-ocean-account-setup.md) | [`_build-push.yml`](../../.github/workflows/_build-push.yml) to push images; [`_deploy-droplet.yml`](../../.github/workflows/_deploy-droplet.yml) to pull them |
| `DIGITALOCEAN_SSH_KEY` | Contents of your **private** key, `~/.ssh/id_ed25519` | [`_deploy-droplet.yml`](../../.github/workflows/_deploy-droplet.yml), loaded into an ssh-agent so Ansible can connect |
| `NETLIFY_AUTH_TOKEN` | Netlify personal access token | [`_deploy-netlify.yml`](../../.github/workflows/_deploy-netlify.yml) |
| `NETLIFY_SITE_ID` | The Netlify site's API ID | [`_deploy-netlify.yml`](../../.github/workflows/_deploy-netlify.yml) |

> **Paste the private key whole.** Include the `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----` lines and the trailing newline. A truncated key fails with a misleading `Permission denied (publickey)` at the Ansible step rather than at the ssh-agent step.

The two Netlify values come from [Frontend Deployment](frontend.md) — leave them until the site exists.

## Variables

Same page, **Variables** tab. These aren't secret, so they're readable in logs.

| Name | Value | Used by |
|---|---|---|
| `DOCR_REGISTRY` | Your registry name, e.g. `fastapi-react-cr` | [`_build-push.yml`](../../.github/workflows/_build-push.yml), to tag images as `registry.digitalocean.com/$DOCR_REGISTRY/app:...` |
| `DIGITALOCEAN_HOST_1` | The droplet's reserved IP | [`_deploy-droplet.yml`](../../.github/workflows/_deploy-droplet.yml), for `ssh-keyscan` |

Both come from `terraform output` — `registry_endpoint` and `app_ip`.

## Scope: repository, not environment

GitHub lets you attach secrets to an **environment** instead of the repository. Be careful here, because the workflows aren't consistent:

- [`_deploy-droplet.yml`](../../.github/workflows/_deploy-droplet.yml) and [`_deploy-netlify.yml`](../../.github/workflows/_deploy-netlify.yml) declare `environment: production`.
- [`_build-push.yml`](../../.github/workflows/_build-push.yml) declares **no environment**.

A job only sees environment secrets for the environment it declares. So if you put `DIGITALOCEAN_ACCESS_TOKEN` in a `production` environment, the build job can't read it and the registry login fails with `401` — while the deploy job that runs later would have worked fine.

**Set all six at repository level.** They're then visible to every job regardless of environment.

If you do want a deploy approval gate, create the `production` environment and add **required reviewers** to it. That pauses the two deploy jobs for sign-off without moving any secrets — the gate comes from the environment existing, not from what's stored in it.

## Setting them from the CLI

Faster than the web UI, and it reads the key from disk so there's no copy-paste truncation:

```bash
gh secret set DIGITALOCEAN_ACCESS_TOKEN --body "dop_v1_..."
gh secret set DIGITALOCEAN_SSH_KEY < ~/.ssh/id_ed25519

gh variable set DOCR_REGISTRY --body "fastapi-react-cr"
gh variable set DIGITALOCEAN_HOST_1 --body "<your-reserved-ip>"
```

Check what's set:

```bash
gh secret list
gh variable list
```

Values can't be read back — only overwritten.

## Things worth knowing

**`secrets: inherit` is doing real work.** Reusable workflows get no secrets by default. [`cd.yml`](../../.github/workflows/cd.yml) passes `secrets: inherit` to each of the three deploy jobs, which is what makes repository secrets visible inside them. Remove it and everything fails with empty credentials.

**The droplet IP is stored in two places.** `DIGITALOCEAN_HOST_1` here, and [`hosts.ini`](../../infrastructure/ansible/hosts.ini) in the repo. If the reserved IP ever changes, both need updating or the deploy will `ssh-keyscan` one host and try to connect to another.

**The frontend build takes no secrets.** There are no `VITE_*` variables — the app reaches the API through a redirect configured in [`netlify.toml`](../../frontend/netlify.toml), not a compile-time URL. So nothing sensitive ends up in the client bundle, and there's nothing to set for the frontend beyond the two Netlify credentials.

**Rotating the DigitalOcean token means three updates.** `terraform.tfvars`, the GitHub secret, and any shell where you've exported it for a manual `deploy.yml` run. Miss the GitHub one and CD keeps passing until the next image build.
