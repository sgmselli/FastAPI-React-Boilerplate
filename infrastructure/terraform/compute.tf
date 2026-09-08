resource "digitalocean_ssh_key" "admin" {
  name       = "${local.name_prefix}-admin"
  public_key = var.ssh_public_key
}

resource "digitalocean_droplet" "app" {
  name   = "${local.name_prefix}-app"
  region = var.region
  size   = var.droplet_size
  image  = var.droplet_image

  vpc_uuid = digitalocean_vpc.main.id
  ssh_keys = [digitalocean_ssh_key.admin.fingerprint]

  monitoring = true
  backups    = var.droplet_backups

  tags = concat(local.common_tags, ["app"])

  lifecycle {
    ignore_changes = [image]
  }
}

resource "digitalocean_reserved_ip" "app" {
  region = var.region
}

resource "digitalocean_reserved_ip_assignment" "app" {
  ip_address = digitalocean_reserved_ip.app.ip_address
  droplet_id = digitalocean_droplet.app.id
}
