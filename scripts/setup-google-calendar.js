const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function setupGoogleCalendar() {
  console.log('📅 Google Calendar Setup Guide\n')

  try {
    // Check current configuration
    const existingSettings = await prisma.settings.findMany({
      where: {
        key: { in: ['google_calendar_service_account_key', 'google_calendar_id', 'calendar_sync_enabled'] }
      }
    })

    console.log('🔍 Current Configuration:')
    const serviceAccount = existingSettings.find(s => s.key === 'google_calendar_service_account_key')
    const calendarId = existingSettings.find(s => s.key === 'google_calendar_id')
    const syncEnabled = existingSettings.find(s => s.key === 'calendar_sync_enabled')

    console.log(`  Service Account: ${serviceAccount ? '✅ Configured' : '❌ Missing'}`)
    console.log(`  Calendar ID: ${calendarId ? '✅ Configured' : '❌ Missing'}`)
    console.log(`  Sync Enabled: ${syncEnabled?.value === 'true' ? '✅ Enabled' : '❌ Disabled'}`)

    if (!serviceAccount || !calendarId) {
      console.log('\n📋 TO FIX CALENDAR SYNC, YOU NEED:')
      console.log('\n1. 🔑 Google Service Account:')
      console.log('   - Go to: https://console.cloud.google.com/')
      console.log('   - Create or select a project')
      console.log('   - Enable Google Calendar API')
      console.log('   - Create Service Account credentials')
      console.log('   - Download the JSON key file')
      
      console.log('\n2. 📅 Google Calendar ID:')
      console.log('   - Open Google Calendar in web browser')
      console.log('   - Go to calendar settings')
      console.log('   - Find "Calendar ID" (looks like: your-email@gmail.com)')
      console.log('   - Or create a dedicated calendar for shuttle bookings')
      
      console.log('\n3. ⚙️  Configure in Admin Panel:')
      console.log('   - Go to: http://localhost:3000/admin/settings')
      console.log('   - Add setting: google_calendar_service_account_key = [paste JSON content]')
      console.log('   - Add setting: google_calendar_id = [your calendar ID]')

      console.log('\n💡 ALTERNATIVE: Quick Test Setup')
      console.log('   If you just want to test, you can use a simple calendar blocking system')
      console.log('   without Google Calendar integration.')
    } else {
      console.log('\n✅ Google Calendar is properly configured!')
      console.log('   Calendar sync should be working.')
    }

    // Check recent bookings for calendar events
    console.log('\n📊 Recent Booking Calendar Status:')
    const recentBookings = await prisma.booking.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        trip: {
          include: { destination: true }
        }
      }
    })

    for (const booking of recentBookings) {
      const calendarEvent = await prisma.settings.findUnique({
        where: { key: `calendar_event_${booking.tripId}` }
      })
      
      console.log(`  Trip to ${booking.trip.destination.name}:`)
      console.log(`    Calendar Event: ${calendarEvent ? '✅ Created' : '❌ Missing'}`)
      if (calendarEvent) {
        console.log(`    Event ID: ${calendarEvent.value}`)
      }
    }

  } catch (error) {
    console.error('❌ Error checking calendar setup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setupGoogleCalendar()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })