#!/bin/bash
# Script para configurar HTTPS en el backend con Nginx y certificado autofirmado
# Este script configura Nginx como reverse proxy con HTTPS

set -e

echo "🔒 Configurando HTTPS con Nginx..."

# Instalar Nginx
dnf install -y nginx

# Crear directorio para certificados
mkdir -p /etc/nginx/ssl

# Generar certificado autofirmado (válido por 365 días)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/nginx/ssl/chainticket.key \
  -out /etc/nginx/ssl/chainticket.crt \
  -subj "/C=US/ST=State/L=City/O=ChainTicket/CN=localhost"

# Configurar Nginx como reverse proxy
cat > /etc/nginx/conf.d/chainticket.conf << 'NGINXCONF'
upstream backend {
    server 127.0.0.1:3001;
}

server {
    listen 80;
    server_name _;
    
    # Redirigir HTTP a HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name _;

    ssl_certificate /etc/nginx/ssl/chainticket.crt;
    ssl_certificate_key /etc/nginx/ssl/chainticket.key;

    # Configuración SSL moderna
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Headers de seguridad
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # Proxypass al backend
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
NGINXCONF

# Probar configuración de Nginx
nginx -t

# Habilitar y arrancar Nginx
systemctl enable nginx
systemctl restart nginx

# Configurar firewall (si está activo)
if command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-service=https
    firewall-cmd --permanent --add-service=http
    firewall-cmd --reload
fi

echo "✅ HTTPS configurado correctamente!"
echo "📝 Nota: Este es un certificado autofirmado."
echo "📝 Los navegadores mostrarán una advertencia la primera vez."
echo "📝 Para producción, considera usar Let's Encrypt con un dominio real."

