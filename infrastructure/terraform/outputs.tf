output "app_ip" {
  description = "Reserved IP for the app droplet. Point the registrar's A record here and use it in the Ansible inventory."
  value       = digitalocean_reserved_ip.app.ip_address
}

output "droplet_private_ip" {
  description = "Private VPC address of the app droplet"
  value       = digitalocean_droplet.app.ipv4_address_private
}

output "ansible_inventory_line" {
  description = "Paste into infrastructure/ansible/hosts.ini under [vm01]"
  value       = "${digitalocean_reserved_ip.app.ip_address} ansible_user=root ansible_ssh_private_key_file=~/.ssh/id_ed25519"
}

output "registry_endpoint" {
  description = "Registry endpoint to tag images against, e.g. <endpoint>/backend:latest"
  value       = digitalocean_container_registry.main.endpoint
}

output "registry_server_url" {
  description = "Registry host used for docker login"
  value       = digitalocean_container_registry.main.server_url
}

output "registry_docker_config" {
  description = "Read-only ~/.docker/config.json contents for the droplet"
  value       = digitalocean_container_registry_docker_credentials.pull.docker_credentials
  sensitive   = true
}
