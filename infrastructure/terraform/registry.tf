resource "digitalocean_container_registry" "main" {
  name                   = var.registry_name
  subscription_tier_slug = var.registry_tier
  region                 = var.registry_region
}

resource "digitalocean_container_registry_docker_credentials" "pull" {
  registry_name  = digitalocean_container_registry.main.name
  write          = false
  expiry_seconds = var.registry_credential_expiry_seconds
}
