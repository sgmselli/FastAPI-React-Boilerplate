#########################
#       Identity        #
#########################

variable "do_token" {
  description = "DigitalOcean personal access token with read/write scope"
  type        = string
  sensitive   = true
}

variable "project_name" {
  description = "Short name for the app, used as the prefix for every resource name"
  type        = string
  default     = "fastapi-react"
}

variable "environment" {
  description = "Deployment environment, used in resource names and the DO project"
  type        = string
  default     = "prod"
}

variable "region" {
  description = "DigitalOcean region slug for the droplet, VPC and reserved IP"
  type        = string
  default     = "lon1"
}

#########################
#        Droplet        #
#########################

variable "droplet_size" {
  description = "Droplet size"
  type        = string
  default     = "s-1vcpu-512mb-10gb"
}

variable "droplet_image" {
  description = "Droplet base image. Jammy, to match what the Ansible playbook assumes."
  type        = string
  default     = "ubuntu-22-04-x64"
}

variable "droplet_backups" {
  description = "Enable DigitalOcean's weekly droplet backups. Adds 20% to the droplet cost."
  type        = bool
  default     = false
}

variable "ssh_public_key" {
  description = "SSH public key uploaded to DigitalOcean and baked into the droplet's root user"
  type        = string
}

#########################
#       Firewall        #
#########################

variable "ssh_allowed_cidrs" {
  description = "CIDRs allowed to reach port 22."
  type        = list(string)
  default     = ["0.0.0.0/0", "::/0"]
}

#########################
#       Registry        #
#########################

variable "registry_name" {
  description = "Container registry name. Must be globally unique across all of DigitalOcean."
  type        = string
}

variable "registry_tier" {
  description = "Registry subscription tier. `starter` is free but caps at 1 repository; the app needs at least backend and frontend."
  type        = string
  default     = "basic"

  validation {
    condition     = contains(["starter", "basic", "professional"], var.registry_tier)
    error_message = "registry_tier must be one of: starter, basic, professional."
  }
}

variable "registry_region" {
  description = "Registry region. DOCR is only available in a subset of regions - lon1 is NOT one of them, so this is separate from var.region."
  type        = string
  default     = "ams3"

  validation {
    condition     = contains(["nyc3", "sfo3", "ams3", "sgp1", "fra1", "blr1", "syd1"], var.registry_region)
    error_message = "registry_region must be a DOCR-supported region: nyc3, sfo3, ams3, sgp1, fra1, blr1, syd1."
  }
}

variable "registry_credential_expiry_seconds" {
  description = "Lifetime of the read-only registry pull credentials handed to the droplet. Defaults to 1 year."
  type        = number
  default     = 31536000
}

#########################
#       Networking      #
#########################

variable "vpc_ip_range" {
  description = "Private IP range for the VPC"
  type        = string
  default     = "10.10.10.0/24"
}
