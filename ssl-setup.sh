#!/bin/bash

# SSL Certificate Setup Script for Let's Encrypt
echo "🔒 Setting up SSL certificates with Let's Encrypt..."

# Check if domain is provided
DOMAIN="tjoeftjaf.xyz"
EMAIL="admin@tjoeftjaf.xyz"  # Change this to your email

echo "🌐 Domain: $DOMAIN"
echo "📧 Email: $EMAIL"

# Create temporary nginx config for initial certificate
echo "📝 Creating temporary nginx config..."
cat > nginx-ssl-setup.conf << EOF
events {
    worker_connections 1024;
}

http {
    server {
        listen 80;
        server_name $DOMAIN www.$DOMAIN;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 404;
        }
    }
}
EOF

# Start nginx with temporary config
echo "🔧 Starting nginx for certificate verification..."
docker run -d --name nginx-ssl-setup \
    -p 80:80 \
    -v $(pwd)/nginx-ssl-setup.conf:/etc/nginx/nginx.conf:ro \
    -v certbot_www:/var/www/certbot \
    nginx:alpine

# Wait for nginx to start
sleep 5

# Get SSL certificate
echo "📜 Requesting SSL certificate..."
docker run --rm \
    -v certbot_conf:/etc/letsencrypt \
    -v certbot_www:/var/www/certbot \
    certbot/certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email $EMAIL \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN \
    -d www.$DOMAIN

# Stop temporary nginx
echo "🛑 Stopping temporary nginx..."
docker stop nginx-ssl-setup
docker rm nginx-ssl-setup

# Clean up temporary config
rm nginx-ssl-setup.conf

# Check if certificates were created
if docker run --rm -v certbot_conf:/etc/letsencrypt certbot/certbot certificates | grep -q $DOMAIN; then
    echo "✅ SSL certificates created successfully!"
    echo "🚀 You can now start your application with: ./deploy.sh"
else
    echo "❌ Failed to create SSL certificates"
    echo "🔍 Please check your domain DNS settings and try again"
    exit 1
fi

echo ""
echo "📋 Next steps:"
echo "   1. Make sure your domain points to this server's IP"
echo "   2. Run ./deploy.sh to start the application"
echo "   3. Test your site at https://$DOMAIN"