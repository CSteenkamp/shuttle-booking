import { prisma } from '@/lib/prisma'

/**
 * Simple calendar blocking system that works without Google Calendar
 * Stores blocked time slots in the database for availability checking
 */

export interface TimeSlot {
  startTime: Date
  endTime: Date
  reason: string
  tripId?: string
}

export async function blockTimeSlot(timeSlot: TimeSlot): Promise<boolean> {
  try {
    // Store the blocked time slot in database settings
    const blockId = `calendar_block_${Date.now()}_${Math.random().toString(36).substring(2)}`
    
    await prisma.settings.create({
      data: {
        key: blockId,
        value: JSON.stringify({
          startTime: timeSlot.startTime.toISOString(),
          endTime: timeSlot.endTime.toISOString(),
          reason: timeSlot.reason,
          tripId: timeSlot.tripId
        }),
        description: `Calendar block: ${timeSlot.reason}`
      }
    })

    console.log(`[CALENDAR BLOCK] ✅ Blocked time slot: ${timeSlot.startTime.toISOString()} - ${timeSlot.endTime.toISOString()}`)
    return true
  } catch (error) {
    console.error('[CALENDAR BLOCK] ❌ Failed to block time slot:', error)
    return false
  }
}

export async function checkTimeSlotAvailability(startTime: Date, endTime: Date): Promise<boolean> {
  try {
    // Get all calendar blocks
    const blocks = await prisma.settings.findMany({
      where: {
        key: {
          startsWith: 'calendar_block_'
        }
      }
    })

    // Check for conflicts
    for (const block of blocks) {
      try {
        const blockData = JSON.parse(block.value)
        const blockStart = new Date(blockData.startTime)
        const blockEnd = new Date(blockData.endTime)

        // Check if times overlap
        if (startTime < blockEnd && endTime > blockStart) {
          console.log(`[CALENDAR BLOCK] ❌ Time slot conflicts with: ${blockData.reason}`)
          return false
        }
      } catch (parseError) {
        console.warn('[CALENDAR BLOCK] Invalid block data:', block.key)
      }
    }

    console.log(`[CALENDAR BLOCK] ✅ Time slot available: ${startTime.toISOString()} - ${endTime.toISOString()}`)
    return true
  } catch (error) {
    console.error('[CALENDAR BLOCK] Error checking availability:', error)
    return true // Default to available if we can't check
  }
}

export async function removeTimeSlotBlock(tripId: string): Promise<boolean> {
  try {
    // Remove all blocks for this trip
    const blocks = await prisma.settings.findMany({
      where: {
        key: {
          startsWith: 'calendar_block_'
        }
      }
    })

    let removedCount = 0
    for (const block of blocks) {
      try {
        const blockData = JSON.parse(block.value)
        if (blockData.tripId === tripId) {
          await prisma.settings.delete({
            where: { id: block.id }
          })
          removedCount++
        }
      } catch (parseError) {
        // Skip invalid blocks
      }
    }

    console.log(`[CALENDAR BLOCK] ✅ Removed ${removedCount} blocks for trip ${tripId}`)
    return true
  } catch (error) {
    console.error('[CALENDAR BLOCK] ❌ Failed to remove blocks:', error)
    return false
  }
}

export async function getBlockedTimeSlots(): Promise<TimeSlot[]> {
  try {
    const blocks = await prisma.settings.findMany({
      where: {
        key: {
          startsWith: 'calendar_block_'
        }
      }
    })

    const timeSlots: TimeSlot[] = []
    for (const block of blocks) {
      try {
        const blockData = JSON.parse(block.value)
        timeSlots.push({
          startTime: new Date(blockData.startTime),
          endTime: new Date(blockData.endTime),
          reason: blockData.reason,
          tripId: blockData.tripId
        })
      } catch (parseError) {
        // Skip invalid blocks
      }
    }

    return timeSlots
  } catch (error) {
    console.error('[CALENDAR BLOCK] Error getting blocked slots:', error)
    return []
  }
}