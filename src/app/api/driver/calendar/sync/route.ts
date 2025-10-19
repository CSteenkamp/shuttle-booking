import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { syncDriverCalendar } from '@/lib/calendar-integration'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/driver/calendar/sync
 * Manually trigger calendar sync
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session || session.user.role !== 'DRIVER') {
      return NextResponse.json(
        { error: 'Unauthorized - Driver access required' },
        { status: 401 }
      )
    }

    // Get driver profile
    const driverId = session.user.driverProfileId

    if (!driverId) {
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 404 }
      )
    }

    // Check if calendar is connected
    const driverCalendar = await prisma.driverCalendar.findUnique({
      where: { driverId }
    })

    if (!driverCalendar || !driverCalendar.isActive) {
      return NextResponse.json(
        { error: 'No active calendar connection found. Please connect your calendar first.' },
        { status: 400 }
      )
    }

    // Sync calendar
    const result = await syncDriverCalendar(driverId)

    return NextResponse.json({
      success: true,
      message: `Synced ${result.eventsCount} calendar events`,
      eventsCount: result.eventsCount,
      syncedAt: result.syncedAt
    })

  } catch (error) {
    console.error('Error syncing calendar:', error)
    return NextResponse.json(
      {
        error: 'Failed to sync calendar',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
