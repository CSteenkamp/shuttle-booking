import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { disconnectCalendar } from '@/lib/calendar-integration'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/driver/calendar
 * Get calendar connection status and recent events
 */
export async function GET(request: NextRequest) {
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

    // Get calendar connection
    const driverCalendar = await prisma.driverCalendar.findUnique({
      where: { driverId }
    })

    if (!driverCalendar) {
      return NextResponse.json({
        connected: false,
        message: 'No calendar connected'
      })
    }

    // Get recent calendar events
    const now = new Date()
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)

    const events = await prisma.calendarEvent.findMany({
      where: {
        driverId,
        startTime: {
          gte: now,
          lte: thirtyDaysFromNow
        }
      },
      orderBy: {
        startTime: 'asc'
      },
      take: 50 // Limit to 50 upcoming events
    })

    return NextResponse.json({
      connected: true,
      calendar: {
        id: driverCalendar.id,
        provider: driverCalendar.provider,
        calendarName: driverCalendar.calendarName,
        isActive: driverCalendar.isActive,
        lastSyncedAt: driverCalendar.lastSyncedAt,
        syncStatus: driverCalendar.syncStatus,
        syncError: driverCalendar.syncError
      },
      upcomingEvents: events.map(event => ({
        id: event.id,
        title: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        status: event.status,
        description: event.description
      })),
      eventsCount: events.length
    })

  } catch (error) {
    console.error('Error fetching calendar status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch calendar status' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/driver/calendar
 * Disconnect calendar
 */
export async function DELETE(request: NextRequest) {
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

    // Disconnect calendar
    const result = await disconnectCalendar(driverId)

    return NextResponse.json({
      success: result.success,
      message: result.message
    })

  } catch (error) {
    console.error('Error disconnecting calendar:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect calendar' },
      { status: 500 }
    )
  }
}
