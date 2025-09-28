#!/bin/bash

# Setup PostgreSQL Development Environment
# This script switches from SQLite to PostgreSQL to match production

echo "🐘 Setting up PostgreSQL Development Environment"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}1. Checking prerequisites...${NC}"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker first.${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ Docker is running${NC}"

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ docker-compose not found. Please install docker-compose.${NC}"
    exit 1
fi
echo -e "${GREEN}   ✅ docker-compose is available${NC}"

echo -e "${BLUE}2. Starting PostgreSQL database...${NC}"

# Start PostgreSQL container
docker-compose -f docker-compose.dev.yml up -d db-dev

# Wait for PostgreSQL to be ready
echo -e "${YELLOW}   ⏳ Waiting for PostgreSQL to be ready...${NC}"
for i in {1..30}; do
    if docker-compose -f docker-compose.dev.yml exec -T db-dev pg_isready -U shuttle_user -d shuttle_booking_dev > /dev/null 2>&1; then
        echo -e "${GREEN}   ✅ PostgreSQL is ready${NC}"
        break
    fi
    if [ $i -eq 30 ]; then
        echo -e "${RED}   ❌ PostgreSQL failed to start within 30 seconds${NC}"
        docker-compose -f docker-compose.dev.yml logs db-dev
        exit 1
    fi
    sleep 1
done

echo -e "${BLUE}3. Backing up existing SQLite data (optional)...${NC}"

# Backup existing dev.db if it exists
if [ -f "prisma/dev.db" ]; then
    echo -e "${YELLOW}   📦 Backing up existing SQLite database...${NC}"
    cp prisma/dev.db "prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)"
    echo -e "${GREEN}   ✅ SQLite database backed up${NC}"
else
    echo -e "${YELLOW}   ℹ️  No existing SQLite database found${NC}"
fi

echo -e "${BLUE}4. Setting up environment variables...${NC}"

# Copy .env.local to .env if .env doesn't exist
if [ ! -f ".env" ]; then
    cp .env.local .env
    echo -e "${GREEN}   ✅ Created .env from .env.local${NC}"
else
    echo -e "${YELLOW}   ⚠️  .env already exists. Please verify DATABASE_URL points to PostgreSQL${NC}"
    echo -e "${YELLOW}      Expected: postgresql://shuttle_user:dev_password_local@localhost:5433/shuttle_booking_dev${NC}"
fi

echo -e "${BLUE}5. Resetting Prisma migrations...${NC}"

# Remove existing migrations (they're SQLite-specific)
if [ -d "prisma/migrations" ]; then
    echo -e "${YELLOW}   🗑️  Removing SQLite migrations...${NC}"
    rm -rf prisma/migrations
    echo -e "${GREEN}   ✅ Old migrations removed${NC}"
fi

echo -e "${BLUE}6. Generating new PostgreSQL migration...${NC}"

# Generate fresh migration for PostgreSQL
npm run prisma:migrate dev --name "init_postgresql_from_sqlite"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✅ PostgreSQL migration created${NC}"
else
    echo -e "${RED}   ❌ Failed to create migration${NC}"
    exit 1
fi

echo -e "${BLUE}7. Regenerating Prisma client...${NC}"

# Generate Prisma client for PostgreSQL
npm run prisma:generate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}   ✅ Prisma client regenerated${NC}"
else
    echo -e "${RED}   ❌ Failed to regenerate Prisma client${NC}"
    exit 1
fi

echo -e "${BLUE}8. Running diagnostic check...${NC}"

# Run diagnostic script to verify everything works
if [ -f "scripts/diagnose-system.js" ]; then
    node scripts/diagnose-system.js
    echo -e "${GREEN}   ✅ Diagnostic completed${NC}"
else
    echo -e "${YELLOW}   ⚠️  Diagnostic script not found${NC}"
fi

echo -e "${GREEN}🎉 PostgreSQL development environment setup complete!${NC}"
echo ""
echo -e "${BLUE}📋 Next steps:${NC}"
echo "   1. Your local database is now PostgreSQL (matches production)"
echo "   2. Database URL: postgresql://shuttle_user:dev_password_local@localhost:5433/shuttle_booking_dev"
echo "   3. pgAdmin available at: http://localhost:5050 (admin@tjoeftjaf.com / admin123)"
echo "   4. Start your Next.js development server: npm run dev"
echo ""
echo -e "${BLUE}🔧 Database management commands:${NC}"
echo "   • View database: docker-compose -f docker-compose.dev.yml exec db-dev psql -U shuttle_user -d shuttle_booking_dev"
echo "   • Stop database: docker-compose -f docker-compose.dev.yml down"
echo "   • Restart database: docker-compose -f docker-compose.dev.yml restart db-dev"
echo "   • View logs: docker-compose -f docker-compose.dev.yml logs db-dev"
echo ""
echo -e "${YELLOW}⚠️  Important notes:${NC}"
echo "   • Your old SQLite data is backed up as prisma/dev.db.backup.*"
echo "   • You'll need to recreate users and test data in PostgreSQL"
echo "   • Use scripts/diagnose-system.js --create-test-user to create test accounts"