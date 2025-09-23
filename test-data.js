const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🔍 Checking existing data...')
  
  // Check existing data
  const userCount = await prisma.user.count()
  const tripCount = await prisma.trip.count()
  const locationCount = await prisma.location.count()
  const bookingCount = await prisma.booking.count()
  
  console.log(`Current data:
  - Users: ${userCount}
  - Trips: ${tripCount}
  - Locations: ${locationCount}
  - Bookings: ${bookingCount}`)

  // Create test admin user if none exists
  let adminUser = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  })

  if (!adminUser) {
    console.log('👤 Creating admin user...')
    const hashedPassword = await bcrypt.hash('admin123', 12)
    adminUser = await prisma.user.create({
      data: {
        email: 'admin@shuttlepro.com',
        name: 'Admin User',
        role: 'ADMIN',
        password: hashedPassword
      }
    })
    console.log('✅ Admin user created:', adminUser.email)
  }

  // Create test regular users if none exist
  const regularUsers = await prisma.user.findMany({
    where: { role: 'CUSTOMER' }
  })

  if (regularUsers.length < 3) {
    console.log('👥 Creating test users...')
    const users = [
      { email: 'john@example.com', name: 'John Smith' },
      { email: 'jane@example.com', name: 'Jane Doe' },
      { email: 'mike@example.com', name: 'Mike Johnson' }
    ]

    for (const userData of users) {
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      })
      
      if (!existingUser) {
        const hashedPassword = await bcrypt.hash('password123', 12)
        const user = await prisma.user.create({
          data: {
            ...userData,
            password: hashedPassword,
            role: 'CUSTOMER'
          }
        })

        // Create credit balance for each user
        await prisma.creditBalance.create({
          data: {
            userId: user.id,
            credits: 10 // Give them 10 credits to start
          }
        })

        console.log('✅ Created user:', user.email, 'with 10 credits')
      }
    }
  }

  // Create locations if none exist
  if (locationCount === 0) {
    console.log('📍 Creating test locations...')
    const locations = [
      {
        name: 'Sandton City',
        address: 'Sandton City Shopping Centre, Rivonia Rd, Sandhurst, Sandton, 2196',
        category: 'SHOPPING',
        isFrequent: true,
        status: 'APPROVED'
      },
      {
        name: 'OR Tambo Airport',
        address: 'O.R. Tambo International Airport, Kempton Park, 1627',
        category: 'TRANSPORT',
        isFrequent: true,
        status: 'APPROVED'
      },
      {
        name: 'University of Witwatersrand',
        address: '1 Jan Smuts Ave, Braamfontein, Johannesburg, 2000',
        category: 'EDUCATION',
        isFrequent: true,
        status: 'APPROVED'
      },
      {
        name: 'Rosebank Mall',
        address: 'Rosebank Mall, 50 Bath Ave, Rosebank, Johannesburg, 2196',
        category: 'SHOPPING',
        isFrequent: true,
        status: 'APPROVED'
      },
      {
        name: 'Melville',
        address: 'Melville, Johannesburg, 2109',
        category: 'RESIDENTIAL',
        isFrequent: true,
        status: 'APPROVED'
      }
    ]

    for (const locationData of locations) {
      await prisma.location.create({ data: locationData })
    }
    console.log('✅ Created test locations')
  }

  // Create trips if none exist
  if (tripCount === 0) {
    console.log('🚐 Creating test trips...')
    const locations = await prisma.location.findMany()
    const now = new Date()
    
    // Create trips for the next 7 days
    for (let day = 0; day < 7; day++) {
      const tripDate = new Date(now)
      tripDate.setDate(now.getDate() + day)
      tripDate.setHours(8, 0, 0, 0) // 8 AM

      for (let trip = 0; trip < 3; trip++) {
        const startTime = new Date(tripDate)
        startTime.setHours(8 + (trip * 4), 0, 0, 0) // 8 AM, 12 PM, 4 PM

        const endTime = new Date(startTime)
        endTime.setHours(startTime.getHours() + 2) // 2 hour trips

        await prisma.trip.create({
          data: {
            destinationId: locations[trip % locations.length].id,
            startTime,
            endTime,
            maxPassengers: 8,
            currentPassengers: 0,
            status: 'SCHEDULED'
          }
        })
      }
    }
    console.log('✅ Created test trips for next 7 days')
  }

  // Create credit packages
  const packageCount = await prisma.creditPackage.count()
  if (packageCount === 0) {
    console.log('💳 Creating credit packages...')
    const packages = [
      { name: 'Starter Pack', credits: 5, price: 25.00, isPopular: false },
      { name: 'Standard Pack', credits: 10, price: 45.00, isPopular: true },
      { name: 'Premium Pack', credits: 20, price: 80.00, isPopular: false },
      { name: 'Family Pack', credits: 50, price: 190.00, isPopular: false }
    ]

    for (const packageData of packages) {
      await prisma.creditPackage.create({
        data: {
          ...packageData,
          isActive: true
        }
      })
    }
    console.log('✅ Created credit packages')
  }

  // Create system settings
  const settingsCount = await prisma.settings.count()
  if (settingsCount === 0) {
    console.log('⚙️ Creating system settings...')
    const settings = [
      { key: 'system_name', value: 'ShuttlePro', description: 'System name displayed throughout the application' },
      { key: 'company_name', value: 'ShuttlePro Transport', description: 'Company name for emails and documents' },
      { key: 'support_email', value: 'support@shuttlepro.com', description: 'Support email address' },
      { key: 'driver_name', value: 'John Driver', description: 'Primary driver name' },
      { key: 'driver_email', value: 'driver@shuttlepro.com', description: 'Driver email for calendar invites' },
      { key: 'creditValue', value: '5.00', description: 'Cost per credit in South African Rand' },
      { key: 'baseTripCost', value: '1', description: 'Base credits required per passenger per trip' },
      { key: 'max_passengers_per_trip', value: '8', description: 'Maximum passengers per trip' },
      { key: 'auto_calendar_sync', value: 'true', description: 'Auto sync bookings to calendar' },
      { key: 'email_service_enabled', value: 'true', description: 'Enable email notifications' }
    ]

    for (const setting of settings) {
      await prisma.settings.create({ data: setting })
    }
    console.log('✅ Created system settings')
  }

  console.log('🎉 Test data setup complete!')
  
  // Final count
  const finalCounts = {
    users: await prisma.user.count(),
    trips: await prisma.trip.count(),
    locations: await prisma.location.count(),
    bookings: await prisma.booking.count(),
    packages: await prisma.creditPackage.count(),
    settings: await prisma.settings.count()
  }
  
  console.log('Final data counts:', finalCounts)
}

main()
  .catch((e) => {
    console.error('Error setting up test data:', e)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })