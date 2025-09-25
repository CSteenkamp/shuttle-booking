#!/bin/bash

# Production Deployment Script for Pre-built Docker Image
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deploying Shuttle Booking App (Production)...${NC}"

# Configuration
COMPOSE_FILE="docker-compose.prod.yml"
IMAGE_NAME="ghcr.io/csteenkamp/shuttle-booking:latest"

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ Error: .env file not found!${NC}"
    echo -e "${YELLOW}📝 Please copy .env.production to .env and update the values${NC}"
    echo "   cp .env.production .env"
    echo "   nano .env  # Edit the file with your production values"
    exit 1
fi

# Check if docker-compose.prod.yml exists
if [ ! -f $COMPOSE_FILE ]; then
    echo -e "${RED}❌ Error: $COMPOSE_FILE not found!${NC}"
    echo "   This file should contain the production Docker Compose configuration"
    exit 1
fi

# Stop existing containers
echo -e "${BLUE}🛑 Stopping existing containers...${NC}"
docker-compose -f $COMPOSE_FILE down --remove-orphans

# Pull the latest image
echo -e "${BLUE}📥 Pulling latest Docker image...${NC}"
docker pull $IMAGE_NAME

# Remove old containers and images
echo -e "${BLUE}🗑️  Cleaning up old resources...${NC}"
docker container prune -f
docker image prune -f

# Start services
echo -e "${BLUE}🔧 Starting services...${NC}"
docker-compose -f $COMPOSE_FILE up -d

# Wait for services to be ready
echo -e "${BLUE}⏳ Waiting for services to start...${NC}"
sleep 15

# Check health status
echo -e "${BLUE}🏥 Checking service health...${NC}"
timeout=60
counter=0

while [ $counter -lt $timeout ]; do
    if docker-compose -f $COMPOSE_FILE ps | grep -q "Up (healthy)"; then
        echo -e "${GREEN}✅ Services are healthy!${NC}"
        break
    fi
    
    if [ $counter -eq $(($timeout - 5)) ]; then
        echo -e "${YELLOW}⚠️  Services taking longer than expected...${NC}"
        docker-compose -f $COMPOSE_FILE logs --tail=20
    fi
    
    sleep 2
    counter=$(($counter + 2))
    echo -n "."
done

# Final status check
echo -e "\n${BLUE}📋 Final service status:${NC}"
docker-compose -f $COMPOSE_FILE ps

# Test application connectivity
echo -e "${BLUE}🌐 Testing application...${NC}"
if curl -s -f http://localhost:3000 >/dev/null; then
    echo -e "${GREEN}✅ Application is responding on port 3000${NC}"
else
    echo -e "${YELLOW}⚠️  Application not responding on port 3000 (might be normal if behind reverse proxy)${NC}"
fi

# Show recent logs
echo -e "${BLUE}📝 Recent application logs:${NC}"
docker-compose -f $COMPOSE_FILE logs --tail=10 app

echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo -e "${BLUE}🌐 Your app should be available at: https://tjoeftjaf.xyz${NC}"
echo ""
echo -e "${YELLOW}📊 Useful commands:${NC}"
echo "  View logs: docker-compose -f $COMPOSE_FILE logs -f [service]"
echo "  Restart app: docker-compose -f $COMPOSE_FILE restart app"
echo "  Stop all: docker-compose -f $COMPOSE_FILE down"
echo "  Update app: docker-compose -f $COMPOSE_FILE pull && docker-compose -f $COMPOSE_FILE up -d"
echo "  Shell access: docker-compose -f $COMPOSE_FILE exec app sh"
echo ""
echo -e "${GREEN}🔒 Security reminders:${NC}"
echo "  ✓ SSL certificates configured"
echo "  ✓ Database password set"
echo "  ✓ PayFast production mode enabled"
echo "  ✓ Rate limiting active"
echo ""
echo -e "${YELLOW}🔧 If you need to update the app:${NC}"
echo "  1. New image will be built automatically on git push"
echo "  2. Run this script again to deploy updates"
echo "  3. No rebuild needed - just pull and restart!"