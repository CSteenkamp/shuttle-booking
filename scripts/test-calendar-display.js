const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testCalendarDisplay() {
  console.log('🗓️  Testing Calendar Display Logic...\n')

  try {
    // Get recent Breerivier trip
    const trip = await prisma.trip.findFirst({
      where: {
        destination: {
          name: 'Breerivier'
        }
      },
      orderBy: { createdAt: 'desc' },
      include: { destination: true }
    })

    if (!trip) {
      console.log('❌ No Breerivier trip found')
      return
    }

    const start = new Date(trip.startTime)
    const end = new Date(trip.endTime)
    const duration = (end - start) / (1000 * 60)

    console.log('🚌 Trip Details:')
    console.log(`  Destination: ${trip.destination.name}`)
    console.log(`  Start: ${start.toLocaleString()}`)
    console.log(`  End: ${end.toLocaleString()}`)
    console.log(`  Duration: ${duration} minutes`)
    console.log()

    // Simulate the WeeklyCalendar logic
    console.log('📅 Calendar Slot Analysis:')
    console.log('  Testing which 20-minute slots this trip should block...')

    // Generate time slots like the WeeklyCalendar does
    const timeSlots = []
    for (let hour = 7; hour < 18; hour++) {
      for (let minute = 0; minute < 60; minute += 20) {
        timeSlots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)
      }
    }

    const tripDay = new Date(start)
    tripDay.setHours(0, 0, 0, 0)

    let blockedSlots = 0
    let startingSlot = null

    timeSlots.forEach(timeSlot => {
      // Replicate the new logic from WeeklyCalendar.tsx
      const [hours, minutes] = timeSlot.split(':').map(Number)
      const slotStart = new Date(tripDay)
      slotStart.setHours(hours, minutes, 0, 0)
      const slotEnd = new Date(slotStart.getTime() + 20 * 60 * 1000) // 20 minutes later

      // Check if trip overlaps with this slot
      const isBlocked = start < slotEnd && end > slotStart
      const isStarting = start.getHours() === hours && start.getMinutes() === minutes

      if (isBlocked) {
        blockedSlots++
        const status = isStarting ? '🔴 START' : '🟡 ONGOING'
        console.log(`    ${timeSlot}: ${status} - Blocked`)
        
        if (isStarting) {
          startingSlot = timeSlot
        }
      } else {
        console.log(`    ${timeSlot}: ⚪ Available`)
      }
    })

    console.log()
    console.log('📊 Summary:')
    console.log(`  Starting slot: ${startingSlot}`)
    console.log(`  Total blocked slots: ${blockedSlots}`)
    console.log(`  Expected blocked slots: ${Math.ceil(duration / 20)} (${duration} min ÷ 20 min)`)
    console.log(`  Status: ${blockedSlots === Math.ceil(duration / 20) ? '✅ CORRECT' : '❌ INCORRECT'}`)

    if (blockedSlots === Math.ceil(duration / 20)) {
      console.log()
      console.log('🎉 SUCCESS! The calendar should now properly block all time slots:')
      console.log(`   - Main slot at ${startingSlot} (shows trip details, booking button)`)
      console.log(`   - ${blockedSlots - 1} continuation slots (shows "ongoing" indicator)`)
      console.log('   - Users cannot book overlapping time slots')
    } else {
      console.log()
      console.log('❌ There may still be an issue with the blocking logic.')
    }

  } catch (error) {
    console.error('❌ Error testing calendar display:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testCalendarDisplay()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })