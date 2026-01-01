# ==================================================
# EC2 para Backend API
# ==================================================

# Buscar la AMI más reciente de Amazon Linux 2023
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Security Group
resource "aws_security_group" "backend" {
  name        = "${var.project_name}-backend-sg-${var.environment}"
  description = "Security group for backend API"

  # SSH (solo para debug - puedes quitar después)
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTP API
  ingress {
    from_port   = 3001
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS (para futuro con certificado)
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Salida a internet
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-backend-sg"
  }
}

# IAM Role para EC2
resource "aws_iam_role" "ec2_backend" {
  name = "${var.project_name}-ec2-backend-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# Permisos DynamoDB
resource "aws_iam_role_policy" "ec2_dynamodb" {
  name = "${var.project_name}-ec2-dynamodb"
  role = aws_iam_role.ec2_backend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
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

# Permisos Bedrock
resource "aws_iam_role_policy" "ec2_bedrock" {
  name = "${var.project_name}-ec2-bedrock"
  role = aws_iam_role.ec2_backend.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
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

# Instance Profile
resource "aws_iam_instance_profile" "backend" {
  name = "${var.project_name}-backend-profile-${var.environment}"
  role = aws_iam_role.ec2_backend.name
}

# EC2 Instance
resource "aws_instance" "backend" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = "t3.micro"
  iam_instance_profile   = aws_iam_instance_profile.backend.name
  vpc_security_group_ids = [aws_security_group.backend.id]

  # User data - instala Node.js y clona el repo
  user_data = <<-EOF
    #!/bin/bash
    set -e
    
    # Logs
    exec > >(tee /var/log/user-data.log) 2>&1
    echo "Starting user-data script..."
    
    # Actualizar sistema
    dnf update -y
    
    # Instalar Node.js 20
    dnf install -y nodejs20 npm git
    
    # Crear directorio para la app
    mkdir -p /opt/chainticket
    cd /opt/chainticket
    
    # Clonar repositorio
    git clone https://github.com/${var.github_owner}/${var.github_repo}.git .
    
    # Ir al backend
    cd backend
    
    # Instalar dependencias
    npm ci --production
    
    # Crear archivo de environment
    cat > .env << 'ENVFILE'
    PORT=3001
    AWS_REGION=${var.aws_region}
    DYNAMODB_TABLE_BUSINESS_METRICS=${aws_dynamodb_table.business_metrics.name}
    DYNAMODB_TABLE_SALES_HISTORY=${aws_dynamodb_table.sales_history.name}
    DYNAMODB_TABLE_AI_CONVERSATIONS=${aws_dynamodb_table.ai_conversations.name}
    BEDROCK_MODEL_ID=amazon.titan-text-express-v1:0
    MOVEMENT_RPC_URL=https://aptos.testnet.porto.movementlabs.xyz/v1
    MOVEMENT_INDEXER_URL=https://indexer.testnet.porto.movementnetwork.xyz/v1/graphql
    CONTRACT_MODULE_ADDRESS=0x0a10dde9540e854e79445a37ed6636086128cfc4d13638077e983a14a4398056
    PRIVY_APP_ID=${var.privy_app_id}
    PRIVY_APP_SECRET=${var.privy_app_secret}
    PAYMENT_RECEIVER_ADDRESS=${var.payment_receiver_address}
    ENVFILE
    
    # Crear servicio systemd
    cat > /etc/systemd/system/chainticket.service << 'SERVICE'
    [Unit]
    Description=ChainTicket Backend API
    After=network.target
    
    [Service]
    Type=simple
    User=root
    WorkingDirectory=/opt/chainticket/backend
    ExecStart=/usr/bin/node server.js
    Restart=on-failure
    RestartSec=10
    StandardOutput=syslog
    StandardError=syslog
    SyslogIdentifier=chainticket
    Environment=NODE_ENV=production
    
    [Install]
    WantedBy=multi-user.target
    SERVICE
    
    # Habilitar y arrancar servicio
    systemctl daemon-reload
    systemctl enable chainticket
    systemctl start chainticket
    
    echo "User-data script completed!"
  EOF

  tags = {
    Name = "${var.project_name}-backend-${var.environment}"
  }

  # Para que se recree si cambia el user_data
  lifecycle {
    create_before_destroy = true
  }
}

# Elastic IP (IP fija)
resource "aws_eip" "backend" {
  instance = aws_instance.backend.id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-backend-eip"
  }
}
