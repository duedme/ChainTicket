
# ============================================
# Outputs
# ============================================

output "dynamodb_tables" {
  description = "DynamoDB table names and ARNs"
  value = {
    business_metrics = {
      name = aws_dynamodb_table.business_metrics.name
      arn  = aws_dynamodb_table.business_metrics.arn
    }
    sales_history = {
      name = aws_dynamodb_table.sales_history.name
      arn  = aws_dynamodb_table.sales_history.arn
    }
    ai_conversations = {
      name = aws_dynamodb_table.ai_conversations.name
      arn  = aws_dynamodb_table.ai_conversations.arn
    }
  }
}

output "bedrock_role_arn" {
  description = "ARN of the Bedrock invoker role"
  value       = aws_iam_role.bedrock_invoker.arn
}

output "backend_credentials" {
  description = "Credentials for backend service (SENSITIVE)"
  sensitive   = true
  value = {
    access_key_id     = aws_iam_access_key.backend_user_key.id
    secret_access_key = aws_iam_access_key.backend_user_key.secret
  }
}

output "backend_user_arn" {
  description = "ARN of the backend IAM user"
  value       = aws_iam_user.backend_user.arn
}

# Outputs útiles para configurar en Amplify
output "amplify_env_vars" {
  description = "Environment variables to set in AWS Amplify"
  value = <<-EOT
  
  ============================================
  🔧 CONFIGURA EN AMPLIFY CONSOLE:
  ============================================
  
  Ve a: Amplify > Tu App > Hosting > Environment variables
  
  AWS_REGION=${var.aws_region}
  DYNAMODB_TABLE_BUSINESS_METRICS=${aws_dynamodb_table.business_metrics.name}
  DYNAMODB_TABLE_SALES_HISTORY=${aws_dynamodb_table.sales_history.name}
  DYNAMODB_TABLE_AI_CONVERSATIONS=${aws_dynamodb_table.ai_conversations.name}
  BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
  
  ⚠️  Para AWS_ACCESS_KEY_ID y AWS_SECRET_ACCESS_KEY:
  Amplify puede usar IAM Role en lugar de credenciales estáticas.
  Ver output "amplify_service_role_config" para configuración recomendada.
  
  EOT
}

output "amplify_service_role_config" {
  description = "IAM configuration for Amplify service role"
  value = <<-EOT
  
  ============================================
  🔐 OPCIÓN RECOMENDADA: IAM Role para Amplify
  ============================================
  
  En lugar de usar Access Keys, configura el Service Role de Amplify
  para que tenga permisos a DynamoDB y Bedrock.
  
  1. Ve a Amplify > Tu App > App settings > General
  2. En "Service role", selecciona o crea un rol
  3. Agrega estas policies al rol:
     - ${aws_iam_role_policy.dynamodb_access_policy.name}
     - ${aws_iam_role_policy.bedrock_invoke_policy.name}
  
  O usa el ARN del rol que creamos:
  ${aws_iam_role.bedrock_invoker.arn}
  
  EOT
}
