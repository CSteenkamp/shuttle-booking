# Quick Start Guide - Multi-Tenant Rideshare Platform

Get your multi-tenant shuttle booking system running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database running
- Git (for version control)

## Step 1: Database Setup (2 minutes)

### Start PostgreSQL
```bash
# Make sure PostgreSQL is running on port 5433
# Check your DATABASE_URL in .env.local
```

### Run Migrations & Seed
```bash
cd shuttle-booking

# Apply database schema
npx prisma migrate dev

# Seed initial data (Stellenbosch + 3 areas)
npx prisma db seed

# Verify setup (optional)
npx prisma studio
```

**What you get:**
- ✅ Multi-tenant database structure
- ✅ Stellenbosch city with 3 service areas
- ✅ All tables and relationships

## Step 2: Environment Check (1 minute)

Verify your `.env.local` has the minimum required:

```env
DATABASE_URL="postgresql://user:password@localhost:5433/shuttle_booking_dev"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**Optional** - Add for Google Calendar integration:
```env
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

## Step 3: Start the App (1 minute)

```bash
# Install dependencies (if not done)
npm install

# Start development server
npm run dev
```

Open http://localhost:3000

## Step 4: Test the Features (2 minutes)

### As Admin

1. **Manage Cities**
   - Go to `/admin/cities`
   - View Stellenbosch and its 3 areas
   - Try adding a new area or city

2. **Review Drivers** (after a driver applies)
   - Go to `/admin/drivers`
   - View pending applications
   - Approve or reject drivers

### As Driver

1. **Apply to Drive**
   - Go to `/driver/apply`
   - Fill out the 5-step application
   - Select Stellenbosch and preferred areas
   - Submit application

2. **Connect Calendar** (optional)
   - After approval, connect Google Calendar
   - Your availability syncs automatically

### As Customer

1. **Book a Trip**
   - Go to `/book`
   - Select "Stellenbosch"
   - Choose service area (Central, Technopark, or Cloetesville)
   - Click time slot to create trip
   - Driver auto-assigned if available

## What's Different from Before?

### For Users
- 🆕 **City/Area Selection:** Choose your location before booking
- 🆕 **Better UX:** Only see trips in your selected area
- 🆕 **Auto-selection:** If only one city/area, skips selection screen

### For Admins
- 🆕 **City Management:** `/admin/cities` - Create and manage cities/areas
- 🆕 **Driver Approval:** `/admin/drivers` - Review and approve driver applications
- 🆕 **Geographic Stats:** See driver counts per city/area

### For Drivers
- 🆕 **Application System:** `/driver/apply` - Professional 5-step application
- 🆕 **Calendar Sync:** Connect Google Calendar for automatic availability
- 🆕 **Area Selection:** Choose specific service areas to operate in

## Common Tasks

### Add a New City

```bash
# Via UI: /admin/cities
# Or via Prisma Studio: npx prisma studio
```

1. Click "Add City"
2. Enter name (e.g., "Cape Town")
3. Select timezone ("Africa/Johannesburg")
4. Set as Active
5. Save

Then add areas to the city:
1. Expand the city
2. Click "Add Area"
3. Enter area name (e.g., "City Bowl")
4. Save

### Approve a Driver

1. Go to `/admin/drivers`
2. Find pending driver
3. Click to view details
4. Click "Approve Driver"
5. Optionally set custom rates
6. Submit

Driver can now be assigned to trips!

### Create a Test Booking

1. Ensure you have:
   - ✅ At least one city with areas
   - ✅ At least one approved driver in that area
   - ✅ Sufficient credits (admins have unlimited)

2. Go to `/book`
3. Select city and area
4. Click any time slot
5. Create new trip
6. Add passengers
7. Submit

Driver auto-assigned if available!

## Troubleshooting

### "Can't reach database server"
```bash
# Check if PostgreSQL is running
psql --version
# Verify DATABASE_URL in .env.local
# Check port matches (default: 5433)
```

### "Migration failed"
```bash
# Reset and retry (WARNING: Deletes data)
npx prisma migrate reset
```

### "No cities available"
```bash
# Seed wasn't run or failed
npx prisma db seed

# Or create manually via Prisma Studio
npx prisma studio
```

### Build errors
```bash
# Clear cache and rebuild
rm -rf .next
npm run build
```

### Calendar integration not working
- See `CALENDAR-INTEGRATION-GUIDE.md` for detailed setup
- Ensure Google OAuth credentials are correct
- Verify redirect URI matches exactly
- Calendar integration is optional - app works without it

## Next Actions

### Production Deployment

1. **Set up production database**
   ```bash
   # Update DATABASE_URL for production
   # Run migrations
   npx prisma migrate deploy
   ```

2. **Set up cron for calendar sync**
   ```bash
   # See CALENDAR-INTEGRATION-GUIDE.md
   # Set CRON_SECRET in production
   # Configure Vercel Cron or external service
   ```

3. **Configure OAuth**
   - Add production URL to Google OAuth
   - Update NEXTAUTH_URL and NEXT_PUBLIC_APP_URL
   - Set secure NEXTAUTH_SECRET

### Recommended Next Steps

1. ✅ **Test all workflows** (admin, driver, customer)
2. ✅ **Add your actual cities and areas**
3. ✅ **Set up Google Calendar** (if using)
4. ✅ **Configure automated sync** (cron job)
5. ✅ **Customize pricing** (via `/admin/pricing`)
6. 🎯 **Start Phase 2** (see PHASE1-COMPLETE.md for suggestions)

## Key Features Available Now

| Feature | Status | URL |
|---------|--------|-----|
| City Management | ✅ Ready | `/admin/cities` |
| Driver Applications | ✅ Ready | `/driver/apply` |
| Driver Approval | ✅ Ready | `/admin/drivers` |
| Location-Based Booking | ✅ Ready | `/book` |
| Auto Driver Assignment | ✅ Ready | Automatic |
| Google Calendar Sync | ✅ Ready | Optional |
| Multi-Tenant Architecture | ✅ Ready | Database |

## Getting Help

### Documentation
- `PHASE1-COMPLETE.md` - Complete feature documentation
- `CALENDAR-INTEGRATION-GUIDE.md` - Calendar setup guide
- `README.md` - Project overview
- `prisma/schema.prisma` - Database schema

### Check Application Status
```bash
# View build output
npm run build

# Check for lint issues
npm run lint

# View database
npx prisma studio
```

## Quick Command Reference

```bash
# Development
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run lint                   # Check for issues

# Database
npx prisma migrate dev         # Run migrations
npx prisma db seed            # Seed data
npx prisma studio             # Visual database browser
npx prisma generate           # Regenerate Prisma client

# Deployment
npx prisma migrate deploy     # Apply migrations in production
npm run start                 # Start production server
```

---

**Ready to Go!** 🚀

Your multi-tenant rideshare platform is ready for testing and deployment. Start by creating cities and areas, then invite drivers to apply!

Questions? Check `PHASE1-COMPLETE.md` for comprehensive documentation.
