const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testCalendarUpdates() {
  console.log('🔄 Testing Calendar Update Functionality...\n')

  try {
    console.log('This test demonstrates how calendar updates work:')
    console.log('1. When you ADD events to Google Calendar → Slots become BLOCKED')
    console.log('2. When you REMOVE events from Google Calendar → Slots become AVAILABLE')
    console.log()

    // Test the API multiple times to show it fetches fresh data
    console.log('📅 Current Calendar State (fetching fresh from Google Calendar):')
    
    const response = await fetch('http://localhost:3000/api/calendar/personal-events?date=2025-09-24T00:00:00.000Z')
    const data = await response.json()
    
    if (data.success) {
      console.log(`  Date: ${data.date}`)
      console.log(`  Total Events: ${data.totalEvents}`)
      console.log(`  Total Blocked Slots: ${data.totalBlockedSlots}`)
      console.log()
      
      if (data.events.length > 0) {
        console.log('🚫 Currently Blocked Slots:')
        data.events.forEach(event => {
          const startTime = new Date(event.start).toLocaleTimeString()
          const endTime = new Date(event.end).toLocaleTimeString()
          console.log(`  "${event.summary}":`)
          console.log(`    Time: ${startTime} - ${endTime}`)
          console.log(`    Blocks: ${event.blockedSlots.join(', ')}`)
        })
        
        console.log()
        console.log('📋 All Blocked Slots:', data.blockedSlots.join(', '))
        
      } else {
        console.log('✅ No personal events found - All slots are available!')
      }
      
      console.log()
      console.log('🔄 How Real-time Updates Work:')
      console.log()
      console.log('ADDING EVENTS:')
      console.log('1. Add event to Google Calendar (e.g., 2pm-3pm meeting)')
      console.log('2. Refresh/navigate in the shuttle booking app')
      console.log('3. → 14:00, 14:20, 14:40 slots become BLOCKED')
      console.log('4. → Orange "UNAVAILABLE" labels appear')
      console.log()
      console.log('REMOVING EVENTS:')
      console.log('1. Delete event from Google Calendar')
      console.log('2. Refresh/navigate in the shuttle booking app')
      console.log('3. → Previously blocked slots become AVAILABLE')
      console.log('4. → Green "Add Trip" buttons appear')
      console.log()
      console.log('EDITING EVENTS:')
      console.log('1. Change event time in Google Calendar')
      console.log('2. Refresh/navigate in the shuttle booking app')
      console.log('3. → Old slots become available, new slots become blocked')
      
      console.log()
      console.log('⚡ Update Triggers:')
      console.log('- Navigate to different week (triggers fresh fetch)')
      console.log('- Refresh browser page (triggers fresh fetch)')
      console.log('- Return to same week (uses fresh data)')
      
      console.log()
      console.log('🧪 TEST THIS:')
      console.log('1. Note your current blocked slots:', data.blockedSlots.join(', '))
      console.log('2. Go to Google Calendar and DELETE the "skaak" event')
      console.log('3. Navigate away and back to this week in the shuttle app')
      console.log('4. The 12:00, 12:20, 12:40 slots should now show green "Add Trip" buttons')
      console.log('5. Then ADD the event back and repeat - slots should block again')
      
    } else {
      console.log('❌ Error fetching calendar data:', data.error)
    }

  } catch (error) {
    console.error('❌ Error testing calendar updates:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCalendarUpdates()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })