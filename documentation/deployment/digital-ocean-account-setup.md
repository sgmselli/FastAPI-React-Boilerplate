# DigitalOcean Account Setup

Everything on the server side runs on DigitalOcean, and nothing else in this guide works without three things first: an account with billing enabled, a **personal access token** so Terraform can create resources on your behalf, and an **SSH key** so you and GitHub Actions can reach the droplet once it exists.

This page only creates those credentials. Actually building the infrastructure comes next, in [Infrastructure](infrastructure.md).

## 1. Create an account

1. Sign up at [cloud.digitalocean.com/registrations/new](https://cloud.digitalocean.com/registrations/new).
2. Verify your email, then add a payment method. **This is not optional** — Terraform can authenticate without billing set up, but every `create` call fails until a valid card or PayPal account is on file.
3. New accounts sometimes land in a manual review queue for a few hours. If `terraform apply` returns `403` on an account that looks fine, check for a banner in the control panel before debugging anything else.

> **This costs money.** The defaults in [`variables.tf`](../../infrastructure/terraform/variables.tf) provision a `s-1vcpu-512mb-10gb` droplet, a reserved IP, and a `basic`-tier container registry. These are the most basic costs which should be around 8$/month. Look on the Digital Ocean console for how much these exactly cost.

## 2. Create a personal access token

Terraform authenticates as you, via a token, rather than as a service account.

1. In the control panel, go to **API** (bottom of the left sidebar) → **Tokens** tab → **Generate New Token**.
2. Scopes: choose **Full Access**, or a custom scope with **read and write** on droplets, VPCs, firewalls, projects, reserved IPs, SSH keys, and container registry. Read-only is not enough — [`providers.tf`](../../infrastructure/terraform/providers.tf) uses this same token for every create and destroy.
3. Copy the token immediately. **It is shown exactly once**; if you lose it, the only fix is to delete it and generate another.

The same token does two jobs, so it goes in two places:

```bash
# Local, for Terraform
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
```

```hcl
do_token = "dop_v1_..."
```

And as a GitHub Actions secret named `DIGITALOCEAN_ACCESS_TOKEN`, which [`_build-push.yml`](../../.github/workflows/_build-push.yml) uses to push images to the registry and [`deploy.yml`](../../infrastructure/ansible/playbooks/deploy.yml) uses to pull them back down on the droplet. Setting up the GitHub side is covered in [Secrets & Variables](secrets.md).

> `terraform.tfvars` is gitignored — see [`infrastructure/.gitignore`](../../infrastructure/.gitignore). Keep it that way; a committed token is a live key to your whole account.

## 3. Create an SSH key

The keypair is generated on your machine. DigitalOcean only ever holds the public half.

```bash
ssh-keygen -t ed25519 -C "your@email.com" -f ~/.ssh/id_ed25519
```

> **Use the filename `id_ed25519`.** [`hosts.ini`](../../infrastructure/ansible/hosts.ini) hardcodes `ansible_ssh_private_key_file=~/.ssh/id_ed25519`, so a key at any other path means editing that line too.

Then read out the public key:

```bash
cat ~/.ssh/id_ed25519.pub
```

Paste the whole line — `ssh-ed25519 AAAA... your@email.com` — into `terraform.tfvars`:

```hcl
ssh_public_key = "ssh-ed25519 AAAA... your@email.com"
```

**There is no need to upload it through the control panel.** Terraform does that itself: [`compute.tf`](../../infrastructure/terraform/compute.tf) creates a `digitalocean_ssh_key` resource from this value and attaches its fingerprint to the droplet, so `root` can log in from the moment the machine boots. Adding the key manually in the UI first will collide with Terraform's copy.

The **private** key later becomes the `DIGITALOCEAN_SSH_KEY` GitHub secret. Copy it whole, including the header and footer lines:

```bash
cat ~/.ssh/id_ed25519
```

## What you should have now

| Value | Where it goes | Used by |
|---|---|---|
| Personal access token | `do_token` in `terraform.tfvars` | Terraform, to create every resource |
| Personal access token | `DIGITALOCEAN_ACCESS_TOKEN` GitHub secret | Pushing and pulling registry images |
| Public key (`id_ed25519.pub`) | `ssh_public_key` in `terraform.tfvars` | Baked into the droplet's `root` user |
| Private key (`id_ed25519`) | Stays on your machine; also `DIGITALOCEAN_SSH_KEY` GitHub secret | Your SSH access, and Ansible in CD |

You'll also need to pick a **globally unique** `registry_name` for `terraform.tfvars` — it's shared across all of DigitalOcean, so common names are long gone.

With those filled in, continue to [Infrastructure](infrastructure.md).

## Things worth knowing

**The token is account-wide.** It isn't scoped to a project, so anything holding it can act on every resource you own. Generate a separate token per machine or per purpose, so revoking one doesn't break the others.

**Rotating the token means updating two places.** `terraform.tfvars` locally and the `DIGITALOCEAN_ACCESS_TOKEN` GitHub secret. Miss the second and CD keeps working until the next image push, then fails at the registry login step with a confusing `401`.

**Narrowing SSH access will lock out CD.** [`variables.tf`](../../infrastructure/terraform/variables.tf) defaults `ssh_allowed_cidrs` to `0.0.0.0/0` because GitHub-hosted runners have no stable IP range worth allowlisting. If you restrict it to your own address, the `deploy` job can no longer reach port 22 and every deploy hangs, so you'd need a self-hosted runner or a bastion to go with it.

**Losing the private key means rebuilding access.** There's no recovery path through the control panel for a droplet you can't log into — you'd add a new key via Terraform and re-apply, or use the browser-based recovery console.
