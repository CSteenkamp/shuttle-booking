import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { 
  syncAllUserBookingsToCalendar, 
  enableAutoCalendarSync, 
  isAutoCalendarSyncEnabled,
  syncTripToCalendar
} from '@/lib/calendar-auto-sync'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    if (action === 'status') {
      // Get auto-sync status
      const isEnabled = await isAutoCalendarSyncEnabled(session.user.id)
      return NextResponse.json({ autoSyncEnabled: isEnabled })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error in calendar sync GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { action, bookingId, enabled } = await request.json()

    switch (action) {
      case 'sync-all':
        // Sync all user bookings to calendar
        const result = await syncAllUserBookingsToCalendar(session.user.id)
        return NextResponse.json(result)

      case 'sync-booking':
        // Sync trip for specific booking to calendar
        if (!bookingId) {
          return NextResponse.json({ error: 'Booking ID required' }, { status: 400 })
        }
        // Get booking to find tripId
        const { prisma } = await import('@/lib/prisma')
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId, userId: session.user.id }
        })
        if (!booking) {
          return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
        }
        const syncResult = await syncTripToCalendar(booking.tripId)
        return NextResponse.json(syncResult)

      case 'toggle-auto-sync':
        // Enable/disable auto calendar sync
        const toggleResult = await enableAutoCalendarSync(session.user.id, enabled)
        return NextResponse.json(toggleResult)

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in calendar sync POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}