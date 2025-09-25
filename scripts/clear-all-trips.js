const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function clearAllTrips() {
  console.log('🗑️  Clearing all existing trips...\n')

  try {
    // First, get a count of existing trips and bookings
    const tripCount = await prisma.trip.count()
    const bookingCount = await prisma.booking.count()
    
    console.log(`Found ${tripCount} trips and ${bookingCount} bookings`)
    
    if (tripCount === 0) {
      console.log('✅ No trips to remove')
      return
    }

    // Get all trips with their bookings for logging
    const trips = await prisma.trip.findMany({
      include: {
        destination: true,
        bookings: {
          include: {
            user: {
              select: {
                email: true,
                name: true
              }
            }
          }
        }
      }
    })

    console.log('\n📋 Trips to be removed:')
    trips.forEach(trip => {
      console.log(`  Trip to ${trip.destination.name}:`)
      console.log(`    Start: ${new Date(trip.startTime).toLocaleString()}`)
      console.log(`    End: ${new Date(trip.endTime).toLocaleString()}`)
      console.log(`    Bookings: ${trip.bookings.length}`)
      
      if (trip.bookings.length > 0) {
        trip.bookings.forEach(booking => {
          console.log(`      - ${booking.user.name || booking.user.email}: ${booking.passengerCount} passenger(s)`)
        })
      }
    })

    console.log('\n⚠️  This will:')
    console.log('1. Delete all trips')
    console.log('2. Delete all bookings (cascading)')
    console.log('3. Remove credit usage transactions for these bookings')
    console.log('4. Refund credits to users for cancelled bookings')

    // Start the deletion process
    console.log('\n🔄 Processing deletions...')

    // Process refunds for existing bookings
    const bookings = await prisma.booking.findMany({
      include: {
        user: true,
        trip: {
          include: {
            destination: true
          }
        }
      }
    })

    let totalRefunded = 0
    for (const booking of bookings) {
      // Refund credits to user
      await prisma.creditBalance.update({
        where: { userId: booking.userId },
        data: {
          credits: { increment: booking.creditsCost }
        }
      })

      // Create refund transaction
      await prisma.creditTransaction.create({
        data: {
          userId: booking.userId,
          type: 'REFUND',
          amount: booking.creditsCost,
          description: `Refund for cancelled trip to ${booking.trip.destination.name}`
        }
      })

      totalRefunded += booking.creditsCost
      console.log(`  ✅ Refunded ${booking.creditsCost} credits to ${booking.user.email}`)
    }

    // Delete all trips (this will cascade delete bookings due to onDelete: Cascade)
    const deleteResult = await prisma.trip.deleteMany({})
    
    console.log(`\n✅ Successfully deleted ${deleteResult.count} trips`)
    console.log(`✅ Refunded ${totalRefunded} credits to ${new Set(bookings.map(b => b.userId)).size} users`)
    
    // Clean up any orphaned calendar event settings
    const calendarEventSettings = await prisma.settings.deleteMany({
      where: {
        key: {
          startsWith: 'calendar_event_'
        }
      }
    })
    
    if (calendarEventSettings.count > 0) {
      console.log(`✅ Cleaned up ${calendarEventSettings.count} calendar event settings`)
    }

    console.log('\n🎉 All trips have been successfully removed!')
    console.log('📊 Database is now clean and ready for new trips with proper durations')

  } catch (error) {
    console.error('❌ Error clearing trips:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearAllTrips()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })