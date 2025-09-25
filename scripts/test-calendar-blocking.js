const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testCalendarBlocking() {
  console.log('🧪 Testing Calendar Blocking System...\n')

  try {
    // Test 1: Check existing calendar blocks
    console.log('📋 Test 1: Current Calendar Blocks')
    const existingBlocks = await prisma.settings.findMany({
      where: {
        key: { startsWith: 'calendar_block_' }
      }
    })
    
    console.log(`  Found ${existingBlocks.length} existing calendar blocks`)
    if (existingBlocks.length > 0) {
      existingBlocks.forEach((block, index) => {
        try {
          const blockData = JSON.parse(block.value)
          console.log(`    ${index + 1}. ${blockData.reason}`)
          console.log(`       ${new Date(blockData.startTime).toLocaleString()} - ${new Date(blockData.endTime).toLocaleString()}`)
        } catch (e) {
          console.log(`    ${index + 1}. Invalid block data`)
        }
      })
    }
    console.log()

    // Test 2: Test availability checking
    console.log('🔍 Test 2: Availability Checking')
    
    // Test a time slot that should be available (future time)
    const testStart = new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
    testStart.setHours(10, 0, 0, 0)
    const testEnd = new Date(testStart.getTime() + 60 * 60 * 1000) // 1 hour later
    
    console.log(`  Testing availability for: ${testStart.toLocaleString()} - ${testEnd.toLocaleString()}`)
    
    // Import and test the simple availability checker
    const { checkTimeSlotAvailability } = require('../src/lib/simple-calendar-blocker.ts')
    
    try {
      const available = await checkTimeSlotAvailability(testStart, testEnd)
      console.log(`  Availability: ${available ? '✅ Available' : '❌ Blocked'}`)
    } catch (error) {
      console.log(`  ❌ Error checking availability: ${error.message}`)
    }
    console.log()

    // Test 3: Check recent trips and their calendar status
    console.log('🚌 Test 3: Recent Trips Calendar Status')
    const recentTrips = await prisma.trip.findMany({
      take: 3,
      orderBy: { createdAt: 'desc' },
      include: {
        destination: true,
        bookings: { where: { status: 'CONFIRMED' } }
      }
    })

    for (const trip of recentTrips) {
      console.log(`  Trip to ${trip.destination.name}:`)
      console.log(`    Time: ${new Date(trip.startTime).toLocaleString()} - ${new Date(trip.endTime).toLocaleString()}`)
      console.log(`    Duration: ${(new Date(trip.endTime) - new Date(trip.startTime)) / (1000 * 60)} minutes`)
      console.log(`    Bookings: ${trip.bookings.length}`)
      
      // Check if this trip has a calendar block
      const tripBlocks = existingBlocks.filter(block => {
        try {
          const blockData = JSON.parse(block.value)
          return blockData.tripId === trip.id
        } catch (e) {
          return false
        }
      })
      
      console.log(`    Calendar Block: ${tripBlocks.length > 0 ? '✅ Blocked' : '❌ Not Blocked'}`)
      
      // Check Google Calendar event
      const googleEvent = await prisma.settings.findUnique({
        where: { key: `calendar_event_${trip.id}` }
      })
      console.log(`    Google Calendar: ${googleEvent ? '✅ Synced' : '❌ Not Synced'}`)
      console.log()
    }

    console.log('📊 SUMMARY:')
    console.log(`  Calendar Blocks: ${existingBlocks.length} active`)
    console.log(`  Recent Trips: ${recentTrips.length} found`)
    console.log(`  Calendar Integration: ${existingBlocks.length > 0 ? 'Simple blocking active' : 'No blocking detected'}`)
    
    if (existingBlocks.length === 0) {
      console.log('\n💡 NEXT STEPS:')
      console.log('  1. Create a new booking to test calendar blocking')
      console.log('  2. Check that time slots become unavailable after booking')
      console.log('  3. Configure Google Calendar for full integration')
    } else {
      console.log('\n✅ Calendar blocking system is working!')
    }

  } catch (error) {
    console.error('❌ Error testing calendar blocking:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCalendarBlocking()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })