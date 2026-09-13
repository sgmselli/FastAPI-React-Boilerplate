# Infrastructure

All the DigitalOcean resources the app runs on are declared as Terraform in [`infrastructure/terraform/`](../../infrastructure/terraform/). One `terraform apply` creates the lot; nothing here is clicked together by hand in the control panel.

This assumes you've already got a token and an SSH key from [DigitalOcean Account Setup](digital-ocean-account-setup.md).

## What gets created

| Resource | File | Purpose |
|---|---|---|
| Project | [`project.tf`](../../infrastructure/terraform/project.tf) | Groups the droplet and reserved IP under one heading in the control panel |
| VPC | [`network.tf`](../../infrastructure/terraform/network.tf) | Private network, `10.10.10.0/24` by default |
| Droplet | [`compute.tf`](../../infrastructure/terraform/compute.tf) | The Ubuntu 22.04 server everything runs on |
| Reserved IP | [`compute.tf`](../../infrastructure/terraform/compute.tf) | A stable public address, detachable from the droplet |
| SSH key | [`compute.tf`](../../infrastructure/terraform/compute.tf) | Uploads your public key and attaches it to the droplet's `root` |
| Firewall | [`firewall.tf`](../../infrastructure/terraform/firewall.tf) | Allows inbound `22`, `80`, `443`; all outbound |
| Container registry | [`registry.tf`](../../infrastructure/terraform/registry.tf) | Where CI pushes the `backend` and `reverse-proxy` images |

Every resource is named `{project_name}-{environment}-*`, built from `local.name_prefix` in [`locals.tf`](../../infrastructure/terraform/locals.tf) — so the defaults give you `fastapi-react-prod-app`, `fastapi-react-prod-vpc`, and so on.

Note what **isn't** here: Postgres and Redis are containers in the Compose stack on the droplet, not managed DigitalOcean databases. That keeps the cost to a single droplet, at the price of running your own database.

## 1. Install Terraform

```bash
brew install terraform   # macOS
terraform -version
```

[`versions.tf`](../../infrastructure/terraform/versions.tf) requires **1.6 or newer**. Other platforms: [developer.hashicorp.com/terraform/install](https://developer.hashicorp.com/terraform/install).

## 2. Fill in `terraform.tfvars`

If you haven't already:

```bash
cd infrastructure/terraform
cp terraform.tfvars.example terraform.tfvars
```

Three values are required — everything else has a default:

```hcl
do_token       = "dop_v1_..."
registry_name  = "your-unique-registry-name"
ssh_public_key = "ssh-ed25519 AAAA... your@email.com"
```

The defaults worth thinking about before the first apply, since changing some of them later means replacing the droplet:

| Variable | Default | Notes |
|---|---|---|
| `region` | `lon1` | Put it near your users |
| `droplet_size` | `s-1vcpu-512mb-10gb` | The cheapest option. It runs the stack, but 512MB is shared by FastAPI, Celery, Postgres, Redis and Nginx — size up if you see the worker getting OOM-killed |
| `registry_region` | `ams3` | **Must be different from `region` if you use `lon1`** — DOCR isn't available there. The validation in [`variables.tf`](../../infrastructure/terraform/variables.tf) lists the regions that work |
| `registry_tier` | `basic` | `starter` is free but caps at one repository, and the app pushes two images |
| `ssh_allowed_cidrs` | open | Narrowing this locks GitHub Actions out of the droplet — see [DigitalOcean Account Setup](digital-ocean-account-setup.md#things-worth-knowing) |

## 3. Initialise

```bash
terraform init
```

Downloads the DigitalOcean provider into `.terraform/` and writes a lock file. Run it once per clone, and again whenever the provider version changes.

## 4. Plan and apply

```bash
terraform plan
```

Read the output before applying. On a first run it should be all creates and no destroys — roughly a dozen resources. If it proposes destroying something on a later run, stop and find out why.

```bash
terraform apply
```

Type `yes` at the prompt. It takes a couple of minutes, most of it waiting for the droplet and registry to come up.

## 5. Record the outputs

```bash
terraform output
```

Two of these ([`outputs.tf`](../../infrastructure/terraform/outputs.tf)) are needed immediately:

**`ansible_inventory_line`** — paste it into [`hosts.ini`](../../infrastructure/ansible/hosts.ini), replacing the existing line under `[vm01]`. That file is committed with a previous deployment's IP, so it **will** be wrong for you:

```ini
[vm01]
<your-reserved-ip> ansible_user=root ansible_ssh_private_key_file=~/.ssh/id_ed25519
```

**`registry_endpoint`** — becomes the `DOCR_REGISTRY` GitHub variable, covered in [Secrets & Variables](secrets.md).

`app_ip` is the same reserved IP, and it's what your domain's A record should point at later in [Domain & SSL](domain-and-ssl.md).

Check you can reach the machine before moving on:

```bash
ssh root@<your-reserved-ip>
```

A bare Ubuntu box with no Docker on it is the expected result — installing that is [Server Provisioning](provisioning.md).

## Changing things later

Edit the `.tf` files or `terraform.tfvars`, then `plan` and `apply` again. Most changes are updates in place, but a few force the droplet to be **destroyed and recreated** — `region`, `droplet_image`, and anything touching the VPC. That means a new droplet with an empty disk, so the Postgres volume goes with it. The reserved IP survives and reattaches, so at least the DNS stays valid.

Resizing (`droplet_size`) is done in place and only needs a reboot.

To tear everything down:

```bash
terraform destroy
```

This deletes the database along with the droplet. There's no undo.

## Things worth knowing

**State is local and gitignored.** `terraform.tfstate` lives in your working copy and is excluded by [`infrastructure/.gitignore`](../../infrastructure/.gitignore). Lose it and Terraform no longer knows the resources exist — it'll try to create duplicates while the originals keep billing. It's also the only place some values are stored in plain text, which is why it isn't committed. For anything beyond one person deploying, move state to a remote backend such as DigitalOcean Spaces.

**Only one person should apply at a time.** With local state there's no locking, so two people running `apply` from separate clones will produce two divergent views of the same account.

**The droplet image is pinned against drift.** `lifecycle { ignore_changes = [image] }` in [`compute.tf`](../../infrastructure/terraform/compute.tf) stops Terraform proposing to rebuild the machine every time DigitalOcean refreshes the Ubuntu image slug.

**The registry has its own read-only credentials.** [`registry.tf`](../../infrastructure/terraform/registry.tf) generates a pull-only Docker credential valid for a year by default. That's what the droplet gets — it can pull images but never push.
