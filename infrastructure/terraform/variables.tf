
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
  default     = ""  # Dejar vacío si solo usas IAM User
}
