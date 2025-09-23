const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function clearAllTrips() {
  try {
    console.log('🧹 Starting cleanup of all trips and related data...')
    
    // Get counts before deletion
    const [tripCount, bookingCount] = await Promise.all([
      prisma.trip.count(),
      prisma.booking.count()
    ])

    console.log(`📊 Current data:`)
    console.log(`   - ${tripCount} trips`)
    console.log(`   - ${bookingCount} bookings`)

    if (tripCount === 0 && bookingCount === 0) {
      console.log('✅ No trips or bookings to delete!')
      return
    }

    // Delete all bookings first (due to foreign key constraints)
    if (bookingCount > 0) {
      console.log('🗑️ Deleting all bookings...')
      const deletedBookings = await prisma.booking.deleteMany()
      console.log(`   ✅ Deleted ${deletedBookings.count} bookings`)
    }

    // Delete all trips
    if (tripCount > 0) {
      console.log('🗑️ Deleting all trips...')
      const deletedTrips = await prisma.trip.deleteMany()
      console.log(`   ✅ Deleted ${deletedTrips.count} trips`)
    }

    // Clean up any orphaned locations (non-frequent ones that were created for trips)
    console.log('🧹 Cleaning up orphaned custom locations...')
    const deletedLocations = await prisma.location.deleteMany({
      where: {
        isFrequent: false,
        trips: {
          none: {}
        },
        pickupBookings: {
          none: {}
        },
        dropoffBookings: {
          none: {}
        }
      }
    })
    console.log(`   ✅ Deleted ${deletedLocations.count} orphaned locations`)

    // Verify cleanup
    const [finalTripCount, finalBookingCount] = await Promise.all([
      prisma.trip.count(),
      prisma.booking.count()
    ])

    console.log('')
    console.log('🎉 Cleanup complete!')
    console.log(`📊 Final counts:`)
    console.log(`   - ${finalTripCount} trips (should be 0)`)
    console.log(`   - ${finalBookingCount} bookings (should be 0)`)
    
    if (finalTripCount === 0 && finalBookingCount === 0) {
      console.log('✅ All trips and bookings successfully cleared!')
    } else {
      console.log('⚠️ Some data may still remain')
    }

  } catch (error) {
    console.error('❌ Error clearing trips:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearAllTrips()