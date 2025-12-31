
# ============================================
# Variables
# ============================================

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "project_name" {
  description = "Project name for resource naming"
  type        = string
  default     = "chainticket"
}

variable "backend_role_arn" {
  description = "ARN of the backend service role (EC2/ECS/Lambda)"
  type        = string
  default     = "" # Dejar vacío si solo usas IAM User
}

# ===== Amplify Variables =====

variable "github_repo_url" {
  description = "GitHub repository URL"
  type        = string
  default     = "https://github.com/duedme/ChainTicket"
}

variable "github_access_token" {
  description = "GitHub Personal Access Token for Amplify"
  type        = string
  sensitive   = true
  default     = ""
}

variable "git_branch" {
  description = "Git branch to deploy"
  type        = string
  default     = "main"
}

variable "privy_app_id" {
  description = "Privy App ID from dashboard"
  type        = string
  default     = ""
}

variable "backend_api_url" {
  description = "Backend API URL"
  type        = string
  default     = "http://localhost:3001" # Cambiar cuando deploys backend
}

variable "custom_domain" {
  description = "Custom domain for Amplify (optional)"
  type        = string
  default     = ""
}
