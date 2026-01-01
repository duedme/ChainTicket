
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

# ===== Amplify Outputs =====

output "amplify_app_id" {
  description = "Amplify App ID"
  value       = aws_amplify_app.chainticket.id
}

output "amplify_default_domain" {
  description = "Amplify default domain URL"
  value       = "https://${aws_amplify_branch.main.branch_name}.${aws_amplify_app.chainticket.default_domain}"
}

output "amplify_app_url" {
  description = "Amplify App URL"
  value       = aws_amplify_app.chainticket.default_domain
}

output "amplify_instructions" {
  description = "Next steps for Amplify"
  value       = <<-EOT
  
  ✅ AMPLIFY CONFIGURADO
  
  App URL: https://${aws_amplify_branch.main.branch_name}.${aws_amplify_app.chainticket.default_domain}
  App ID:  ${aws_amplify_app.chainticket.id}
  
  PRÓXIMOS PASOS:
  1. Push código a GitHub rama '${var.git_branch}'
  2. Amplify detectará el push y hará build automático
  3. Esperar ~5 minutos para primer deploy
  4. Verificar en: https://console.aws.amazon.com/amplify/home#${aws_amplify_app.chainticket.id}
  
  VARIABLES DE ENTORNO ya configuradas:
  - VITE_MOVEMENT_RPC_URL
  - VITE_MOVEMENT_INDEXER_URL
  - VITE_CONTRACT_ADDRESS
  - VITE_PRIVY_APP_ID
  - VITE_API_URL
  
  EOT
}

/* output "api_gateway_url" {
  description = "URL of the API Gateway"
  value       = aws_apigatewayv2_api.backend.api_endpoint
} */

/* output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.backend_api.function_name
} */

output "backend_url" {
  description = "URL del Backend API"
  value       = "http://${aws_eip.backend.public_ip}:3001"
}

output "backend_public_ip" {
  description = "IP pública del backend"
  value       = aws_eip.backend.public_ip
}

output "ssh_command" {
  description = "Comando SSH para conectar (necesitas key pair)"
  value       = "ssh ec2-user@${aws_eip.backend.public_ip}"
}
