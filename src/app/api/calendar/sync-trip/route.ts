import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { syncTripToCalendar } from '@/lib/calendar-auto-sync'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const { tripId } = await request.json()

    if (!tripId) {
      return NextResponse.json(
        { error: 'Missing trip ID' },
        { status: 400 }
      )
    }

    // Sync the trip to calendar
    const result = await syncTripToCalendar(tripId)

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        eventId: result.eventId,
        provider: result.provider,
        message: `Calendar event synced successfully using ${result.provider}`
      })
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to sync trip to calendar' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error syncing trip to calendar:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}