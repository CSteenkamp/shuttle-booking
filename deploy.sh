#!/bin/bash

# Shuttle Booking App Deployment Script
echo "🚀 Deploying Shuttle Booking App..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "📝 Please copy .env.production to .env and update the values"
    echo "   cp .env.production .env"
    echo "   nano .env  # Edit the file with your production values"
    exit 1
fi

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose down

# Remove old images
echo "🗑️  Removing old images..."
docker-compose down --rmi all

# Pull latest changes (if deploying from git)
# echo "📥 Pulling latest changes..."
# git pull origin main

# Build and start containers
echo "🔨 Building and starting containers..."
docker-compose up -d --build

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "📊 Running database migrations..."
docker-compose exec app npx prisma migrate deploy

# Generate Prisma client
echo "🔧 Generating Prisma client..."
docker-compose exec app npx prisma generate

# Check container status
echo "📋 Container status:"
docker-compose ps

# Show logs
echo "📝 Recent logs:"
docker-compose logs --tail=20

echo "✅ Deployment complete!"
echo "🌐 Your app should be available at: https://tjoeftjaf.xyz"
echo ""
echo "📊 Useful commands:"
echo "   View logs: docker-compose logs -f"
echo "   Restart app: docker-compose restart app"
echo "   Stop all: docker-compose down"
echo "   Update app: ./deploy.sh"
echo ""
echo "🔒 Don't forget to:"
echo "   1. Set up SSL certificates with Let's Encrypt"
echo "   2. Configure your domain DNS to point to this server"
echo "   3. Update PayFast webhook URLs in production"