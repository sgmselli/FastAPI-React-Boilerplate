resource "digitalocean_project" "main" {
  name        = local.name_prefix
  description = "Infrastructure for the ${var.project_name} app (${var.environment})"
  purpose     = "Web Application"
  environment = local.project_environment

  resources = [
    digitalocean_droplet.app.urn,
    digitalocean_reserved_ip.app.urn,
  ]
}
