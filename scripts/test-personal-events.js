const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testPersonalEvents() {
  console.log('📅 Testing Personal Events Detection...\n')

  try {
    // Check if Google Calendar is configured
    const googleCredentials = await prisma.settings.findMany({
      where: {
        key: { in: ['google_calendar_service_account', 'google_calendar_id'] }
      }
    })

    console.log('🔧 Configuration Status:')
    const serviceAccount = googleCredentials.find(s => s.key === 'google_calendar_service_account')
    const calendarId = googleCredentials.find(s => s.key === 'google_calendar_id')
    
    console.log(`  Service Account: ${serviceAccount ? '✅ Configured' : '❌ Missing'}`)
    console.log(`  Calendar ID: ${calendarId ? '✅ Configured' : '❌ Missing'}`)

    if (!serviceAccount || !calendarId) {
      console.log('\n❌ Google Calendar not configured. Cannot test personal events.')
      return
    }

    console.log(`  Calendar ID: ${calendarId.value}`)
    console.log()

    // Test Google Calendar API connection
    console.log('🔍 Testing Google Calendar API access...')
    
    try {
      // Import Google Calendar service
      const { GoogleCalendarService } = require('../src/lib/google-calendar.ts')
      
      const calendarService = new GoogleCalendarService()
      const credentials = JSON.parse(serviceAccount.value)
      
      await calendarService.authenticate({
        serviceAccountKey: credentials,
        calendarId: calendarId.value
      })

      console.log('✅ Successfully authenticated with Google Calendar')

      // Get today's events
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      console.log(`\n📋 Fetching events for today (${today.toDateString()})...`)

      const events = await calendarService.getEvents(calendarId.value, today, tomorrow)
      
      console.log(`Found ${events.length} events today:`)
      
      if (events.length === 0) {
        console.log('  No events found for today')
      } else {
        events.forEach((event, index) => {
          const start = new Date(event.start.dateTime || event.start.date)
          const end = new Date(event.end.dateTime || event.end.date)
          
          console.log(`  ${index + 1}. ${event.summary || 'No title'}`)
          console.log(`     Time: ${start.toLocaleTimeString()} - ${end.toLocaleTimeString()}`)
          console.log(`     Duration: ${(end - start) / (1000 * 60)} minutes`)
          
          // Check if this would block shuttle booking slots
          const blockedSlots = []
          for (let hour = 7; hour < 18; hour++) {
            for (let minute = 0; minute < 60; minute += 20) {
              const slotStart = new Date(today)
              slotStart.setHours(hour, minute, 0, 0)
              const slotEnd = new Date(slotStart.getTime() + 20 * 60 * 1000)
              
              if (start < slotEnd && end > slotStart) {
                const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
                blockedSlots.push(timeSlot)
              }
            }
          }
          
          if (blockedSlots.length > 0) {
            console.log(`     Blocks shuttle slots: ${blockedSlots.join(', ')}`)
          }
          console.log()
        })
      }

      // Check specifically for 12pm event
      const noon = new Date(today)
      noon.setHours(12, 0, 0, 0)
      const onepm = new Date(today)
      onepm.setHours(13, 0, 0, 0)

      const noonEvents = events.filter(event => {
        const eventStart = new Date(event.start.dateTime || event.start.date)
        const eventEnd = new Date(event.end.dateTime || event.end.date)
        return eventStart < onepm && eventEnd > noon
      })

      console.log(`🕐 Events at 12pm: ${noonEvents.length}`)
      if (noonEvents.length > 0) {
        console.log('✅ Found your personal event at 12pm! This should block shuttle bookings.')
      } else {
        console.log('❌ No events found at 12pm. Please check your personal event.')
      }

    } catch (apiError) {
      console.error('❌ Google Calendar API error:', apiError.message)
      console.log('This could be due to:')
      console.log('1. Service account doesn\'t have access to the calendar')
      console.log('2. Calendar ID is incorrect')
      console.log('3. Google Calendar API not enabled')
    }

  } catch (error) {
    console.error('❌ Error testing personal events:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testPersonalEvents()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })