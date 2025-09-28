# Database Migration: SQLite → PostgreSQL

## 🚨 Critical Issue Identified

Your local development environment was using **SQLite** while production uses **PostgreSQL**. This mismatch causes:

- Authentication issues (different data types)
- Migration problems (incompatible SQL syntax)
- Development/production parity issues
- Deployment complications with Docker

## 📊 Database Differences Found

### **Before (Local SQLite):**
```
Provider: sqlite
Database: prisma/dev.db (file-based)
URL: "file:./dev.db"
Data Types: SQLite-specific
```

### **After (Local PostgreSQL):**
```
Provider: postgresql
Database: shuttle_booking_dev (server-based)
URL: "postgresql://shuttle_user:dev_password_local@localhost:5433/shuttle_booking_dev"
Data Types: PostgreSQL-specific
```

### **Production (PostgreSQL):**
```
Provider: postgresql
Database: shuttle_booking
URL: "postgresql://shuttle_user:secure_lFiFL*x8ftaeWDgu7R65e@db:5432/shuttle_booking"
Data Types: PostgreSQL-specific
```

## 🔄 Migration Process

### **Step 1: Automatic Setup (Recommended)**

```bash
# Run the automated setup script
npm run db:setup

# Or manually:
./scripts/setup-postgres-dev.sh
```

This script will:
1. ✅ Start PostgreSQL Docker container
2. ✅ Backup your existing SQLite database
3. ✅ Update environment variables
4. ✅ Reset Prisma migrations for PostgreSQL
5. ✅ Generate new migration
6. ✅ Regenerate Prisma client
7. ✅ Run diagnostic checks

### **Step 2: Manual Setup (If needed)**

```bash
# 1. Start PostgreSQL
docker-compose -f docker-compose.dev.yml up -d db-dev

# 2. Update environment
cp .env.local .env

# 3. Reset migrations
rm -rf prisma/migrations

# 4. Create new migration
npm run prisma:migrate dev --name "init_postgresql"

# 5. Generate client
npm run prisma:generate
```

## 🐘 PostgreSQL Development Environment

### **Services Available:**

1. **PostgreSQL Database**
   - Port: `5433` (different from production 5432)
   - Database: `shuttle_booking_dev`
   - User: `shuttle_user`
   - Password: `dev_password_local`

2. **pgAdmin (Database Management)**
   - URL: http://localhost:5050
   - Email: `admin@tjoeftjaf.com`
   - Password: `admin123`

### **Database Management Commands:**

```bash
# Connect to database
docker-compose -f docker-compose.dev.yml exec db-dev psql -U shuttle_user -d shuttle_booking_dev

# View logs
docker-compose -f docker-compose.dev.yml logs db-dev

# Stop database
docker-compose -f docker-compose.dev.yml down

# Restart database
docker-compose -f docker-compose.dev.yml restart db-dev

# View database with pgAdmin
open http://localhost:5050
```

## 📋 Environment Configuration

### **New .env (Local Development):**
```env
DATABASE_URL="postgresql://shuttle_user:dev_password_local@localhost:5433/shuttle_booking_dev"
NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="local-development-secret-32-chars-min"
NODE_ENV="development"
```

### **Production .env:**
```env
DATABASE_URL="postgresql://shuttle_user:secure_lFiFL*x8ftaeWDgu7R65e@db:5432/shuttle_booking"
NEXTAUTH_URL="https://tjoeftjaf.xyz"
NEXTAUTH_SECRET="ylFiFL*x8ftaeWDgu7R65_extended_to_32_chars_minimum"
NODE_ENV="production"
```

## 🔧 Prisma Schema Changes

### **Updated Provider:**
```prisma
// Before
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// After
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### **Data Type Compatibility:**
- ✅ String → VARCHAR/TEXT
- ✅ Int → INTEGER
- ✅ Float → DECIMAL/NUMERIC
- ✅ Boolean → BOOLEAN
- ✅ DateTime → TIMESTAMP
- ✅ Json → JSONB (PostgreSQL advantage!)

## 🧪 Testing Database Compatibility

### **Run Diagnostic:**
```bash
node scripts/diagnose-system.js --create-test-user
```

### **Test User Operations:**
```bash
# Create test admin
node scripts/diagnose-system.js --create-test-user

# Delete specific user (now works with PostgreSQL)
node scripts/delete-specific-user.js user@example.com --confirm

# Clear all users (if needed)
node scripts/clear-users.js --confirm
```

## 🚀 Benefits of PostgreSQL Development

### **Development/Production Parity:**
- ✅ Same database engine
- ✅ Same data types
- ✅ Same SQL syntax
- ✅ Same constraints and indexes

### **Advanced Features:**
- ✅ JSONB for better JSON handling
- ✅ Better performance for complex queries
- ✅ Full-text search capabilities
- ✅ Advanced indexing options

### **Deployment Confidence:**
- ✅ No surprises in production
- ✅ Migration testing in development
- ✅ Schema compatibility validation

## 🔄 Data Migration (If Needed)

If you need to migrate existing SQLite data to PostgreSQL:

### **Option 1: Export/Import**
```bash
# Export from SQLite
sqlite3 prisma/dev.db.backup.* ".dump" > sqlite_dump.sql

# Convert and import to PostgreSQL
# (Manual conversion needed for syntax differences)
```

### **Option 2: Fresh Start (Recommended)**
```bash
# Create fresh test data
node scripts/diagnose-system.js --create-test-user

# Use admin panel to recreate necessary data
open http://localhost:3001/admin
```

## ⚠️ Important Notes

### **Port Conflicts:**
- Local PostgreSQL: Port `5433`
- Production PostgreSQL: Port `5432`
- This prevents conflicts when connecting to both

### **Database Names:**
- Local: `shuttle_booking_dev`
- Production: `shuttle_booking`
- This prevents accidental data mixing

### **Backup Safety:**
- Your SQLite database is backed up as `prisma/dev.db.backup.*`
- You can always revert if needed

## 🎯 Next Steps After Migration

1. **Start Development Server:**
   ```bash
   npm run dev
   ```

2. **Create Test Data:**
   ```bash
   node scripts/diagnose-system.js --create-test-user
   ```

3. **Test Authentication:**
   - Try logging in with test user
   - Verify user creation/deletion works

4. **Test Calendar Integration:**
   - Configure Google Calendar in admin panel
   - Test calendar event creation

5. **Deploy with Confidence:**
   - Your local environment now matches production
   - Migrations will work seamlessly

## 🆘 Troubleshooting

### **Database Connection Issues:**
```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.dev.yml ps

# Check logs
docker-compose -f docker-compose.dev.yml logs db-dev

# Restart if needed
docker-compose -f docker-compose.dev.yml restart db-dev
```

### **Migration Issues:**
```bash
# Reset and try again
npm run prisma:reset
npm run prisma:migrate dev --name "fresh_start"
```

### **Client Generation Issues:**
```bash
# Clear and regenerate
rm -rf node_modules/.prisma
npm run prisma:generate
```

---

## 🎉 Success Indicators

After successful migration, you should see:
- ✅ Local development uses PostgreSQL
- ✅ Database operations work locally
- ✅ User creation/deletion functions properly
- ✅ No more SQLite/PostgreSQL compatibility errors
- ✅ Production deployments work smoothly