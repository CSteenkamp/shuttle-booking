# Phase 1: Multi-Tenant Driver System - Migration Guide

## 📋 Overview

This guide covers the database migration for the multi-tenant driver system implementation (Phase 1).

## ⚠️ IMPORTANT: Backup First!

**Before running any migrations, backup your database:**

```bash
# If using PostgreSQL
pg_dump -U your_user -d shuttle_booking_dev > backup_$(date +%Y%m%d_%H%M%S).sql

# Or if using Docker
docker exec your_postgres_container pg_dump -U your_user shuttle_booking_dev > backup_$(date +%Y%m%d_%H%M%S).sql
```

## 🗃️ What's Being Added

### New Models:
- **City** - Geographic tenants (towns/cities)
- **Area** - Suburbs within cities
- **DriverProfile** - Extended driver information
- **DriverArea** - Driver-to-area assignments
- **DriverCalendar** - Calendar sync metadata
- **TripAssignment** - Driver trip assignments
- **DriverEarnings** - Earnings tracking
- **DriverPricingTier** - Custom driver rates
- **TownAdmin** - Town-level admin assignments

### Updated Models:
- **User** - Added DRIVER, TOWN_ADMIN, SUPPORT roles + driverProfile relation
- **Trip** - Added cityId, areaId, assignments
- **Location** - Added cityId, areaId, driverPricing
- **Booking** - Added driver info fields (assignedDriverId, driverName, etc.)

### New Enums:
- **CityStatus** - ACTIVE, INACTIVE, MAINTENANCE
- **AreaStatus** - ACTIVE, INACTIVE
- **DriverStatus** - PENDING, APPROVED, ACTIVE, SUSPENDED, REJECTED, INACTIVE
- **AssignmentStatus** - ASSIGNED, ACCEPTED, DECLINED, etc.
- **PayoutStatus** - PENDING, PROCESSING, PAID, FAILED, CANCELLED

## 🚀 Running the Migration

### Step 1: Start Your Database

```bash
# If using Docker Compose
cd "/Users/christiaansteenkamp/Coding Projects/Project-z/shuttle-booking"
docker-compose up -d

# Or start PostgreSQL service
# brew services start postgresql@14  # macOS
# sudo service postgresql start      # Linux
```

### Step 2: Create the Migration

```bash
cd "/Users/christiaansteenkamp/Coding Projects/Project-z/shuttle-booking"
npx prisma migrate dev --name add_multi_tenant_driver_system
```

This will:
1. Generate SQL migration files
2. Apply them to your development database
3. Regenerate Prisma Client

### Step 3: Verify Migration

```bash
# Check migration status
npx prisma migrate status

# Open Prisma Studio to verify
npx prisma studio
```

## 🌱 Seeding Default Data

After migration, run the seed script to create default city/area:

```bash
npm run prisma:seed
```

This creates:
- Default city: "Pretoria" (or your specified city)
- Default area: "Central"
- Backfills existing data to default city/area

## 🔄 Data Backfill Strategy

### Existing Data Handling:

1. **All existing Trips** → Assigned to default city/area
2. **All existing Locations** → Assigned to default city/area
3. **Existing Users** → Roles remain unchanged
4. **Existing Bookings** → No driver assigned yet (assignedDriverId = NULL)

### Why Optional Fields?

All new city/area fields are **optional** (`String?`) to ensure:
- ✅ Existing data remains valid
- ✅ No breaking changes to current operations
- ✅ Gradual rollout possible

## 🧪 Testing the Migration

### 1. Check Schema

```bash
npx prisma validate
```

### 2. Test Queries

```typescript
// Test new models
const cities = await prisma.city.findMany()
const drivers = await prisma.driverProfile.findMany()

// Test updated relations
const tripsWithCity = await prisma.trip.findMany({
  include: { city: true, area: true, assignments: true }
})
```

### 3. Verify Indexes

```sql
-- Check indexes were created
SELECT * FROM pg_indexes WHERE tablename IN (
  'cities', 'areas', 'driver_profiles', 'trip_assignments', 'driver_earnings'
);
```

## ⚠️ Troubleshooting

### Migration Fails with "relation already exists"

```bash
# Reset and try again (DESTRUCTIVE - only for dev)
npx prisma migrate reset
npx prisma migrate dev
```

### Foreign Key Constraint Errors

Check that:
1. All referenced IDs exist
2. Cascade deletes are set up correctly
3. Optional fields are marked with `?`

### Performance Issues After Migration

```bash
# Analyze tables for query planning
psql -d shuttle_booking_dev -c "ANALYZE trips, bookings, driver_profiles;"
```

## 📊 Migration Impact

### Database Changes:
- **9 new tables** created
- **5 existing tables** modified
- **~15 new indexes** added
- **5 new enums** created

### Estimated Downtime:
- **Small DB (<10k records)**: ~5 seconds
- **Medium DB (10k-100k)**: ~30 seconds
- **Large DB (100k+)**: 1-2 minutes

### Storage Impact:
- Empty tables: ~5MB
- With data: +~10% of current DB size

## 🔐 Production Migration Checklist

- [ ] Backup database
- [ ] Test migration on staging environment
- [ ] Review generated SQL in migrations folder
- [ ] Schedule maintenance window
- [ ] Notify users of downtime
- [ ] Run migration with monitoring
- [ ] Verify data integrity
- [ ] Test critical user flows
- [ ] Monitor error logs
- [ ] Have rollback plan ready

## 🔙 Rollback Plan

If something goes wrong:

```bash
# Revert last migration
npx prisma migrate resolve --rolled-back 20XXXXXX_add_multi_tenant_driver_system

# Restore from backup
psql -U your_user -d shuttle_booking_dev < backup_YYYYMMDD_HHMMSS.sql
```

## 📝 Post-Migration Tasks

1. ✅ Run seed script to create default city/area
2. ✅ Update any custom queries in your codebase
3. ✅ Test booking flow end-to-end
4. ✅ Test admin panels
5. ✅ Monitor application logs for errors
6. ✅ Update API documentation

## 🎯 Next Steps After Migration

Once migration is successful:

1. **Create your first driver**: Visit `/admin/drivers` (upcoming)
2. **Set up cities/areas**: Visit `/admin/cities` (upcoming)
3. **Test driver application**: Visit `/driver/apply` (upcoming)
4. **Configure driver calendar sync**: OAuth setup required

## 📞 Support

If you encounter issues:

1. Check Prisma docs: https://pris.ly/docs
2. Review migration files in `prisma/migrations/`
3. Check application logs
4. Verify environment variables in `.env`

---

**Schema Updated**: January 2025
**Migration Version**: Phase 1 MVP
**Prisma Version**: 6.16.2
