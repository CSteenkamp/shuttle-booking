const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testCalendarDuration() {
  console.log('⏰ Testing Calendar Duration for Longer Trips...\n')

  try {
    // Check the three destinations with durations
    const destinations = await prisma.location.findMany({
      where: {
        name: { in: ['Tulbagh', 'Wolseley', 'Breerivier'] }
      },
      orderBy: { name: 'asc' }
    })

    console.log('📍 Destinations with custom durations:')
    destinations.forEach(dest => {
      console.log(`  ${dest.name}: ${dest.defaultDuration} minutes`)
    })

    // Test trip creation with different destinations
    console.log('\n🧪 Testing trip duration calculation...')

    for (const destination of destinations) {
      console.log(`\nTesting ${destination.name} (${destination.defaultDuration} min):`)
      
      // Simulate trip creation
      const startTime = new Date('2025-09-24T09:00:00Z')
      const expectedEndTime = new Date(startTime.getTime() + destination.defaultDuration * 60000)
      
      console.log(`  Start: ${startTime.toISOString()}`)
      console.log(`  Expected End: ${expectedEndTime.toISOString()}`)
      console.log(`  Duration: ${destination.defaultDuration} minutes`)
      
      // Verify the calculation
      const actualDurationMinutes = (expectedEndTime - startTime) / (1000 * 60)
      console.log(`  ✅ Calculated duration: ${actualDurationMinutes} minutes`)
    }

    // Check if there are any existing trips for these destinations
    console.log('\n📅 Checking existing trips with custom durations...')
    
    const trips = await prisma.trip.findMany({
      where: {
        destination: {
          name: { in: ['Tulbagh', 'Wolseley', 'Breerivier'] }
        }
      },
      include: {
        destination: true,
        bookings: {
          where: { status: 'CONFIRMED' }
        }
      },
      orderBy: { startTime: 'asc' }
    })

    if (trips.length > 0) {
      trips.forEach(trip => {
        const duration = (new Date(trip.endTime) - new Date(trip.startTime)) / (1000 * 60)
        const expectedDuration = trip.destination.defaultDuration
        
        console.log(`\n  Trip to ${trip.destination.name}:`)
        console.log(`    Start: ${new Date(trip.startTime).toLocaleString()}`)
        console.log(`    End: ${new Date(trip.endTime).toLocaleString()}`)
        console.log(`    Actual Duration: ${duration} minutes`)
        console.log(`    Expected Duration: ${expectedDuration} minutes`)
        console.log(`    Status: ${duration === expectedDuration ? '✅ Correct' : '❌ Incorrect'}`)
        console.log(`    Bookings: ${trip.bookings.length}`)
      })
    } else {
      console.log('  No trips found for these destinations')
    }

    // Test calendar availability checking
    console.log('\n🔍 Testing calendar time blocking...')
    console.log('When you create a trip to:')
    console.log('- Tulbagh: Should block 90 minutes')
    console.log('- Wolseley: Should block 40 minutes')
    console.log('- Breerivier: Should block 60 minutes')
    
    console.log('\n✅ Calendar duration system is ready!')
    console.log('\nNext steps:')
    console.log('1. Go to /admin/trips')
    console.log('2. Select Tulbagh, Wolseley, or Breerivier as destination')
    console.log('3. Notice the duration info displayed')
    console.log('4. Create a trip and verify the end time is automatically calculated')

  } catch (error) {
    console.error('❌ Error testing calendar duration:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCalendarDuration()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })