resource "digitalocean_firewall" "app" {
  name        = "${local.name_prefix}-app"
  droplet_ids = [digitalocean_droplet.app.id]
  tags        = local.common_tags

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = var.ssh_allowed_cidrs
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = local.any_ipv4_ipv6
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = local.any_ipv4_ipv6
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = local.any_ipv4_ipv6
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = local.any_ipv4_ipv6
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = local.any_ipv4_ipv6
  }
}
