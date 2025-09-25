const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugRecentBooking() {
  console.log('🔍 Debugging recent Breerivier booking...\n')

  try {
    // Get the most recent trip
    const recentTrip = await prisma.trip.findFirst({
      orderBy: { createdAt: 'desc' },
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

    if (!recentTrip) {
      console.log('❌ No trips found')
      return
    }

    console.log('📊 Most recent trip details:')
    console.log(`  Destination: ${recentTrip.destination.name}`)
    console.log(`  Expected Duration: ${recentTrip.destination.defaultDuration} minutes`)
    console.log(`  Start Time: ${new Date(recentTrip.startTime).toLocaleString()}`)
    console.log(`  End Time: ${new Date(recentTrip.endTime).toLocaleString()}`)
    
    const actualDuration = (new Date(recentTrip.endTime) - new Date(recentTrip.startTime)) / (1000 * 60)
    console.log(`  Actual Duration: ${actualDuration} minutes`)
    console.log(`  Duration Status: ${actualDuration === recentTrip.destination.defaultDuration ? '✅ Correct' : '❌ Incorrect'}`)
    
    console.log(`  Bookings: ${recentTrip.bookings.length}`)
    recentTrip.bookings.forEach(booking => {
      console.log(`    - ${booking.user.name || booking.user.email}: ${booking.creditsCost} credits`)
    })

    // Check calendar sync settings
    console.log('\n📅 Calendar sync status:')
    const calendarSyncEnabled = await prisma.settings.findUnique({
      where: { key: 'calendar_sync_enabled' }
    })
    console.log(`  Calendar sync enabled: ${calendarSyncEnabled?.value || 'not set'}`)

    const calendarEventSetting = await prisma.settings.findUnique({
      where: { key: `calendar_event_${recentTrip.id}` }
    })
    console.log(`  Calendar event created: ${calendarEventSetting ? 'Yes - ' + calendarEventSetting.value : 'No'}`)

    // Check Google Calendar credentials
    const googleCredentials = await prisma.settings.findMany({
      where: {
        key: { in: ['google_calendar_service_account_key', 'google_calendar_id'] }
      }
    })
    console.log(`  Google Calendar credentials: ${googleCredentials.length}/2 configured`)

    // Check Breerivier destination details
    console.log('\n🏔️  Breerivier destination details:')
    const breerivier = await prisma.location.findFirst({
      where: { name: 'Breerivier' },
      include: {
        pricingTiers: { orderBy: { passengerCount: 'asc' } }
      }
    })

    if (breerivier) {
      console.log(`  ID: ${breerivier.id}`)
      console.log(`  Default Duration: ${breerivier.defaultDuration} minutes`)
      console.log(`  Base Cost: R${breerivier.baseCost}`)
      console.log(`  Pricing Tiers: ${breerivier.pricingTiers.length}`)
      breerivier.pricingTiers.forEach(tier => {
        console.log(`    ${tier.passengerCount} passenger(s): R${tier.costPerPerson} each`)
      })
    }

    // Check if the trip was created through the admin interface or booking interface
    console.log('\n🤔 Possible issues:')
    if (actualDuration === 20) {
      console.log('  ❌ Trip duration is 20 minutes (default) instead of 60 minutes')
      console.log('  📋 This suggests the trip was created with hardcoded endTime')
      console.log('  🔧 Check if the admin trip creation is using the updated API')
    }

    if (!calendarEventSetting) {
      console.log('  ❌ No calendar event was created')
      console.log('  📋 This suggests calendar sync failed')
      console.log('  🔧 Check calendar sync logs and credentials')
    }

  } catch (error) {
    console.error('❌ Error debugging booking:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugRecentBooking()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })