#########################
#        Uptime         #
#########################

resource "digitalocean_uptime_check" "api" {
  name    = "${local.name_prefix}-api-health"
  target  = var.health_check_url
  type    = "https"
  regions = ["us_east", "us_west", "eu_west", "se_asia"]
}

# Down from every region, so one region's network blip doesn't alert
resource "digitalocean_uptime_alert" "down" {
  name     = "${local.name_prefix}-api-down"
  check_id = digitalocean_uptime_check.api.id
  type     = "down_global"
  period   = "2m"

  notifications {
    email = [var.alert_email]
  }
}

resource "digitalocean_uptime_alert" "latency" {
  name       = "${local.name_prefix}-api-slow"
  check_id   = digitalocean_uptime_check.api.id
  type       = "latency"
  threshold  = 2000
  comparison = "greater_than"
  period     = "5m"

  notifications {
    email = [var.alert_email]
  }
}

# Certbot renews at 30 days, so this only fires if renewal has stopped working
resource "digitalocean_uptime_alert" "ssl_expiry" {
  name       = "${local.name_prefix}-api-ssl-expiry"
  check_id   = digitalocean_uptime_check.api.id
  type       = "ssl_expiry"
  threshold  = 14
  comparison = "less_than"
  period     = "1h"

  notifications {
    email = [var.alert_email]
  }
}

#########################
#   Droplet resources   #
#########################

resource "digitalocean_monitor_alert" "cpu" {
  description = "${local.name_prefix} CPU above 80%"
  type        = "v1/insights/droplet/cpu"
  compare     = "GreaterThan"
  value       = 80
  window      = "10m"
  entities    = [digitalocean_droplet.app.id]

  alerts {
    email = [var.alert_email]
  }
}

resource "digitalocean_monitor_alert" "memory" {
  description = "${local.name_prefix} memory above 90%"
  type        = "v1/insights/droplet/memory_utilization_percent"
  compare     = "GreaterThan"
  value       = 90
  window      = "10m"
  entities    = [digitalocean_droplet.app.id]

  alerts {
    email = [var.alert_email]
  }
}

resource "digitalocean_monitor_alert" "disk" {
  description = "${local.name_prefix} disk above 80%"
  type        = "v1/insights/droplet/disk_utilization_percent"
  compare     = "GreaterThan"
  value       = 80
  window      = "5m"
  entities    = [digitalocean_droplet.app.id]

  alerts {
    email = [var.alert_email]
  }
}
