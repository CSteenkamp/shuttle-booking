import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // ============================================================================
  // 1. CREATE DEFAULT CITY & AREA (Multi-Tenant Setup)
  // ============================================================================
  console.log('📍 Creating default city and area...')

  const defaultCity = await prisma.city.upsert({
    where: { name: 'Ceres' },
    update: {},
    create: {
      name: 'Ceres',
      timezone: 'Africa/Johannesburg',
      status: 'ACTIVE',
      country: 'South Africa',
      province: 'Western Cape',
      description: 'Shuttle service in Ceres and surrounding areas',
      operatingHours: {
        monday: { start: '06:00', end: '20:00' },
        tuesday: { start: '06:00', end: '20:00' },
        wednesday: { start: '06:00', end: '20:00' },
        thursday: { start: '06:00', end: '20:00' },
        friday: { start: '06:00', end: '22:00' },
        saturday: { start: '07:00', end: '20:00' },
        sunday: { start: '08:00', end: '18:00' }
      },
      settings: {
        defaultPricing: 30,
        maxTripsPerDay: 50,
        advanceBookingDays: 14
      }
    }
  })

  const defaultArea = await prisma.area.upsert({
    where: {
      cityId_name: {
        cityId: defaultCity.id,
        name: 'Central'
      }
    },
    update: {},
    create: {
      cityId: defaultCity.id,
      name: 'Central',
      description: 'Central Ceres - primary operational zone',
      status: 'ACTIVE',
      centerLat: -33.368333, // Verified coordinates for Ceres
      centerLng: 19.309167,
      radius: 10.0 // 10km radius
    }
  })

  console.log(`✅ Created city: ${defaultCity.name}`)
  console.log(`✅ Created area: ${defaultArea.name}`)

  // ============================================================================
  // 2. BACKFILL EXISTING DATA
  // ============================================================================
  console.log('🔄 Backfilling existing data with city/area...')

  // Update all locations without city/area
  const locationsUpdated = await prisma.location.updateMany({
    where: { cityId: null },
    data: {
      cityId: defaultCity.id,
      areaId: defaultArea.id
    }
  })
  console.log(`✅ Updated ${locationsUpdated.count} locations`)

  // Update all trips without city/area
  const tripsUpdated = await prisma.trip.updateMany({
    where: { cityId: null },
    data: {
      cityId: defaultCity.id,
      areaId: defaultArea.id
    }
  })
  console.log(`✅ Updated ${tripsUpdated.count} trips`)

  // ============================================================================
  // 3. CREATE DEFAULT SETTINGS
  // ============================================================================
  console.log('⚙️ Creating default settings...')

  await prisma.settings.upsert({
    where: { key: 'CREDIT_COST' },
    update: {},
    create: {
      key: 'CREDIT_COST',
      value: '25',
      description: 'Cost per credit in ZAR',
    },
  })

  await prisma.settings.upsert({
    where: { key: 'SERVICE_AREA_RADIUS_KM' },
    update: {},
    create: {
      key: 'SERVICE_AREA_RADIUS_KM',
      value: '5',
      description: 'Service area radius in kilometers',
    },
  })

  await prisma.settings.upsert({
    where: { key: 'BOOKING_CUTOFF_MINUTES' },
    update: {},
    create: {
      key: 'BOOKING_CUTOFF_MINUTES',
      value: '30',
      description: 'Minutes before trip when bookings close',
    },
  })

  await prisma.settings.upsert({
    where: { key: 'DRIVER_COMMISSION_PERCENT' },
    update: {},
    create: {
      key: 'DRIVER_COMMISSION_PERCENT',
      value: '15',
      description: 'Platform commission percentage for driver earnings',
    },
  })

  await prisma.settings.upsert({
    where: { key: 'DEFAULT_DRIVER_BASE_RATE' },
    update: {},
    create: {
      key: 'DEFAULT_DRIVER_BASE_RATE',
      value: '30',
      description: 'Default base rate in credits for drivers',
    },
  })

  console.log('✅ Settings configured')

  // ============================================================================
  // 4. CREATE DEFAULT FREQUENT LOCATIONS
  // ============================================================================
  console.log('📍 Creating default frequent locations...')

  await prisma.location.upsert({
    where: { id: 'town-center' },
    update: {},
    create: {
      id: 'town-center',
      name: 'Ceres Town Center',
      address: 'Voortrekker Street, Ceres, Western Cape',
      isFrequent: true,
      latitude: -33.368333, // City center coordinates
      longitude: 19.309167,
      cityId: defaultCity.id,
      areaId: defaultArea.id,
      category: 'shopping',
      status: 'APPROVED',
      defaultDuration: 15,
      baseCost: 30
    },
  })

  await prisma.location.upsert({
    where: { id: 'shopping-mall' },
    update: {},
    create: {
      id: 'shopping-mall',
      name: 'Ceres Shopping Centre',
      address: 'Main Road, Ceres, Western Cape',
      isFrequent: true,
      latitude: -33.365, // Slightly north of center
      longitude: 19.312,
      cityId: defaultCity.id,
      areaId: defaultArea.id,
      category: 'shopping',
      status: 'APPROVED',
      defaultDuration: 20,
      baseCost: 35
    },
  })

  await prisma.location.upsert({
    where: { id: 'school-1' },
    update: {},
    create: {
      id: 'school-1',
      name: 'Ceres High School',
      address: 'School Street, Ceres, Western Cape',
      isFrequent: true,
      latitude: -33.371, // South of center
      longitude: 19.308,
      cityId: defaultCity.id,
      areaId: defaultArea.id,
      category: 'school',
      status: 'APPROVED',
      defaultDuration: 10,
      baseCost: 25
    },
  })

  await prisma.location.upsert({
    where: { id: 'sports-club' },
    update: {},
    create: {
      id: 'sports-club',
      name: 'Ceres Sports Club',
      address: 'Sports Road, Ceres, Western Cape',
      isFrequent: true,
      latitude: -33.366, // West of center
      longitude: 19.305,
      cityId: defaultCity.id,
      areaId: defaultArea.id,
      category: 'sports',
      status: 'APPROVED',
      defaultDuration: 15,
      baseCost: 30
    },
  })

  console.log('✅ Created 4 frequent locations')

  // ============================================================================
  // SUMMARY
  // ============================================================================
  console.log('\n🎉 Database seeding completed successfully!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`📍 City created: ${defaultCity.name}`)
  console.log(`📍 Area created: ${defaultArea.name}`)
  console.log(`📌 Locations backfilled: ${locationsUpdated.count}`)
  console.log(`🚗 Trips backfilled: ${tripsUpdated.count}`)
  console.log('⚙️  Settings: 7 configured')
  console.log('📍 Frequent locations: 4 created')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n✨ Your database is ready for multi-tenant operations!')
  console.log('\n📝 Next steps:')
  console.log('   1. Visit /admin/cities to manage cities')
  console.log('   2. Visit /admin/drivers to approve driver applications')
  console.log('   3. Create your first driver at /driver/apply')
  console.log('   4. Test the multi-city booking flow\n')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })