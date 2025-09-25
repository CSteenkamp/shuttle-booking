#!/bin/bash

# Build and Push Docker Image Script
set -e

# Configuration
IMAGE_NAME="shuttle-booking"
REGISTRY="ghcr.io"
USERNAME="christiaansteenkamp"  # Change this to your GitHub username
REPO_NAME="shuttle-booking"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Building and pushing Docker image...${NC}"

# Get version from package.json or use timestamp
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "$(date +%Y%m%d%H%M%S)")
FULL_IMAGE_NAME="${REGISTRY}/${USERNAME}/${REPO_NAME}"

echo -e "${YELLOW}📋 Build Information:${NC}"
echo "  Image: ${FULL_IMAGE_NAME}"
echo "  Version: ${VERSION}"
echo "  Tags: latest, ${VERSION}"

# Check if logged in to registry
echo -e "${BLUE}🔐 Checking registry authentication...${NC}"
if ! docker info | grep -q "Registry:"; then
    echo -e "${YELLOW}⚠️  Not logged in to registry. Attempting login...${NC}"
    echo -e "${YELLOW}💡 For GitHub Container Registry, use:${NC}"
    echo "  docker login ghcr.io -u ${USERNAME} -p YOUR_GITHUB_TOKEN"
    
    # Attempt to login (will prompt for token)
    docker login ghcr.io -u ${USERNAME}
fi

# Build the image
echo -e "${BLUE}🔨 Building Docker image...${NC}"
docker build -t ${FULL_IMAGE_NAME}:${VERSION} -t ${FULL_IMAGE_NAME}:latest .

# Check image size
IMAGE_SIZE=$(docker images ${FULL_IMAGE_NAME}:latest --format "{{.Size}}")
echo -e "${GREEN}✅ Build complete! Image size: ${IMAGE_SIZE}${NC}"

# Push the image
echo -e "${BLUE}📤 Pushing image to registry...${NC}"
docker push ${FULL_IMAGE_NAME}:${VERSION}
docker push ${FULL_IMAGE_NAME}:latest

echo -e "${GREEN}🎉 Successfully pushed image!${NC}"
echo -e "${YELLOW}📋 Usage:${NC}"
echo "  Pull: docker pull ${FULL_IMAGE_NAME}:latest"
echo "  Run: docker run -p 3000:3000 ${FULL_IMAGE_NAME}:latest"
echo ""
echo -e "${YELLOW}🚀 Deploy with:${NC}"
echo "  docker-compose -f docker-compose.prod.yml up -d"

# Optional: Clean up local images to save space
read -p "🗑️  Clean up local build images? (y/N) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    docker rmi $(docker images ${FULL_IMAGE_NAME} -q) 2>/dev/null || true
    echo -e "${GREEN}✅ Local images cleaned up${NC}"
fi

echo -e "${GREEN}🏁 All done!${NC}"