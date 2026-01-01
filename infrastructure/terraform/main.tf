
# ============================================
# ChainTicket - AWS Infrastructure
# DynamoDB + Bedrock Setup
# ============================================

terraform {
  required_version = ">= 1.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
    archive = {
      source  = "hashicorp/archive"
      version = "~> 2.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }

  }

  # Backend en S3 para estado remoto
  backend "s3" {
    bucket = "restake-watch"
    key    = "ChainTicket/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "ChainTicket"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Hackathon   = "Movement-M1"
    }
  }
}

# ============================================
# DYNAMODB TABLES (Serverless - On-Demand)
# ============================================

# Tabla principal de métricas de negocios para contexto de IA
resource "aws_dynamodb_table" "business_metrics" {
  name         = "${var.project_name}-business-metrics-${var.environment}"
  billing_mode = "PAY_PER_REQUEST" # Serverless - paga solo por uso

  # Partition Key: businessId
  hash_key = "pk"
  # Sort Key: para diferentes tipos de registros
  range_key = "sk"

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  # GSI para buscar por tipo de negocio
  attribute {
    name = "businessType"
    type = "S"
  }

  global_secondary_index {
    name            = "BusinessTypeIndex"
    hash_key        = "businessType"
    range_key       = "pk"
    projection_type = "ALL"
  }

  # TTL para limpiar datos antiguos automáticamente (opcional)
  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  # Point-in-time recovery (backup continuo)
  point_in_time_recovery {
    enabled = var.environment == "prod" ? true : false
  }

  tags = {
    Name    = "Business Metrics Table"
    Purpose = "AI Context and Business Analytics"
  }
}

# Tabla de historial de ventas/transacciones
resource "aws_dynamodb_table" "sales_history" {
  name         = "${var.project_name}-sales-history-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "pk" # BUSINESS#<id>
  range_key = "sk" # SALE#<timestamp> o DAY#<date>

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  # GSI para buscar ventas por fecha global
  attribute {
    name = "saleDate"
    type = "S"
  }

  global_secondary_index {
    name            = "SaleDateIndex"
    hash_key        = "saleDate"
    range_key       = "pk"
    projection_type = "ALL"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  tags = {
    Name    = "Sales History Table"
    Purpose = "Transaction History for Analytics"
  }
}

# Tabla de conversaciones con IA (para contexto y mejora)
resource "aws_dynamodb_table" "ai_conversations" {
  name         = "${var.project_name}-ai-conversations-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"

  hash_key  = "pk" # BUSINESS#<id> o USER#<id>
  range_key = "sk" # CONV#<timestamp>

  attribute {
    name = "pk"
    type = "S"
  }

  attribute {
    name = "sk"
    type = "S"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  tags = {
    Name    = "AI Conversations Table"
    Purpose = "Store AI interaction history"
  }
}

# ============================================
# IAM ROLE PARA BEDROCK (Simplificado para Amplify)
# ============================================

# Role que puede ser asumido por Lambda o Amplify
resource "aws_iam_role" "bedrock_invoker" {
  name = "${var.project_name}-bedrock-invoker-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = [
            "lambda.amazonaws.com",
            "amplify.amazonaws.com"
          ]
        }
      }
    ]
  })

  tags = {
    Name = "Bedrock Invoker Role"
  }
}


# Policy para invocar modelos de Bedrock
resource "aws_iam_role_policy" "bedrock_invoke_policy" {
  name = "${var.project_name}-bedrock-invoke-policy"
  role = aws_iam_role.bedrock_invoker.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "BedrockInvoke"
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = [
          "arn:aws:bedrock:${var.aws_region}::foundation-model/anthropic.claude-3-sonnet-*",
          "arn:aws:bedrock:${var.aws_region}::foundation-model/anthropic.claude-3-haiku-*",
          "arn:aws:bedrock:${var.aws_region}::foundation-model/amazon.titan-*",
          "arn:aws:bedrock:${var.aws_region}::foundation-model/meta.llama*"
        ]
      },
      {
        Sid    = "BedrockList"
        Effect = "Allow"
        Action = [
          "bedrock:ListFoundationModels",
          "bedrock:GetFoundationModel"
        ]
        Resource = "*"
      }
    ]
  })
}

# Policy para acceder a DynamoDB
resource "aws_iam_role_policy" "dynamodb_access_policy" {
  name = "${var.project_name}-dynamodb-access-policy"
  role = aws_iam_role.bedrock_invoker.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.business_metrics.arn,
          "${aws_dynamodb_table.business_metrics.arn}/index/*",
          aws_dynamodb_table.sales_history.arn,
          "${aws_dynamodb_table.sales_history.arn}/index/*",
          aws_dynamodb_table.ai_conversations.arn,
          "${aws_dynamodb_table.ai_conversations.arn}/index/*"
        ]
      }
    ]
  })
}

# ============================================
# IAM USER PARA BACKEND (Replit/Desarrollo)
# ============================================

resource "aws_iam_user" "backend_user" {
  name = "${var.project_name}-backend-user-${var.environment}"

  tags = {
    Name    = "Backend Service User"
    Purpose = "Access DynamoDB and Bedrock from backend"
  }
}

resource "aws_iam_access_key" "backend_user_key" {
  user = aws_iam_user.backend_user.name
}

# Policy directa para el usuario del backend
resource "aws_iam_user_policy" "backend_user_policy" {
  name = "${var.project_name}-backend-policy"
  user = aws_iam_user.backend_user.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBFullAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.business_metrics.arn,
          "${aws_dynamodb_table.business_metrics.arn}/index/*",
          aws_dynamodb_table.sales_history.arn,
          "${aws_dynamodb_table.sales_history.arn}/index/*",
          aws_dynamodb_table.ai_conversations.arn,
          "${aws_dynamodb_table.ai_conversations.arn}/index/*"
        ]
      },
      {
        Sid    = "BedrockInvoke"
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = [
          "arn:aws:bedrock:${var.aws_region}::foundation-model/amazon.titan-*"
        ]
      }
    ]
  })
}

# ============================================
# POLICY PARA AMPLIFY SERVICE ROLE
# ============================================

# Service Role para Amplify
resource "aws_iam_policy" "amplify_backend_policy" {
  name        = "${var.project_name}-amplify-backend-policy-${var.environment}"
  description = "Policy for Amplify to access DynamoDB and Bedrock"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DynamoDBAccess"
        Effect = "Allow"
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:BatchGetItem",
          "dynamodb:BatchWriteItem"
        ]
        Resource = [
          aws_dynamodb_table.business_metrics.arn,
          "${aws_dynamodb_table.business_metrics.arn}/index/*",
          aws_dynamodb_table.sales_history.arn,
          "${aws_dynamodb_table.sales_history.arn}/index/*",
          aws_dynamodb_table.ai_conversations.arn,
          "${aws_dynamodb_table.ai_conversations.arn}/index/*"
        ]
      },
      {
        Sid    = "BedrockAccess"
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream"
        ]
        Resource = [
          "arn:aws:bedrock:${var.aws_region}::foundation-model/anthropic.claude-3-*",
          "arn:aws:bedrock:${var.aws_region}::foundation-model/amazon.titan-*"
        ]
      }
    ]
  })
}


