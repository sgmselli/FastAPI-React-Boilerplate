# Deployment

## Architecture

Our React frontend is hosted on Netlify.

Our NGINX reverse proxy, FastAPI backend, PostgreSQL database, Celery worker, Redis queue are all hosted on a Digital Ocean droplet

Our frontend makes api calls to the droplet, which hit our reverse proxy first. This terminates SSL, allowing us to provide HTTPS, and redirects our request to the backend.

A high level diagram demonstrates this:

![Architecture diagram: the browser loads the React frontend from Netlify, which proxies /api/* to a DigitalOcean droplet running Nginx, FastAPI, PostgreSQL, Redis and Celery in Docker, with Terraform, Ansible and GitHub Actions provisioning and deploying it.](../images/architecure_diagram.png)

## Steps to deploy

1. [Digital Ocean Account Set Up](digital-ocean-account-setup.md) — creating an account, an API token and an SSH key
2. [Build Infrastructure](infrastructure.md) — provisioning the droplet, registry and network with Terraform
3. [Server Provisioning](provisioning.md) — installing Docker and writing the production env files with Ansible
4. [Secrets & Variables](secrets.md) — the credentials GitHub Actions needs, and where each one goes
5. [CI/CD Pipelines set up](ci-cd.md) — how tests, builds and deploys run on every push
6. [Frontend Deployment](frontend.md) — connecting the site to Netlify
7. [Domain & HTTPS set up](domain-and-ssl.md) — pointing DNS at the droplet and issuing certificates

Work through them in order for a first deployment. After that, only [CI/CD Pipelines](ci-cd.md) matters day to day.
