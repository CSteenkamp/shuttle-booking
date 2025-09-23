import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { getGoogleCalendarCredentials, GoogleCalendarService } from '@/lib/google-calendar'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    if (!dateParam) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      )
    }

    const date = new Date(dateParam)
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    // Get Google Calendar credentials
    const credentials = await getGoogleCalendarCredentials()
    
    if (!credentials) {
      return NextResponse.json(
        { error: 'Google Calendar not configured' },
        { status: 400 }
      )
    }

    // Set up date range for the whole day
    const dayStart = new Date(date)
    dayStart.setHours(0, 0, 0, 0)
    
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    console.log('Checking events for date range:', {
      start: dayStart.toISOString(),
      end: dayEnd.toISOString(),
      calendarId: credentials.calendarId
    })

    const calendarService = new GoogleCalendarService()
    await calendarService.authenticate(credentials)
    
    const events = await calendarService.getEvents(dayStart, dayEnd, credentials.calendarId)

    console.log('Found events:', events.length)
    events.forEach((event: any, index: number) => {
      console.log(`Event ${index + 1}:`, {
        summary: event.summary,
        start: event.start,
        end: event.end,
        status: event.status
      })
    })

    return NextResponse.json({
      success: true,
      calendarId: credentials.calendarId,
      dateRange: {
        start: dayStart.toISOString(),
        end: dayEnd.toISOString()
      },
      eventsFound: events.length,
      events: events.map((event: any) => ({
        id: event.id,
        summary: event.summary || '(No title)',
        start: event.start,
        end: event.end,
        status: event.status,
        attendees: event.attendees,
        creator: event.creator
      }))
    })

  } catch (error) {
    console.error('Error debugging calendar events:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}