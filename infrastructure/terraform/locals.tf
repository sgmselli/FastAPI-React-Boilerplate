locals {
  name_prefix = "${var.project_name}-${var.environment}"

  project_environment = lookup({
    dev     = "Development"
    staging = "Staging"
    prod    = "Production"
  }, var.environment, "Production")

  common_tags = [
    var.project_name,
    var.environment,
  ]

  any_ipv4_ipv6 = ["0.0.0.0/0", "::/0"]
}
