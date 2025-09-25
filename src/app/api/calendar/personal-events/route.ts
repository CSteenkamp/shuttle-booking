import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { GoogleCalendarService, getGoogleCalendarCredentials } from '@/lib/google-calendar'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    
    if (!dateParam) {
      return NextResponse.json({
        success: false,
        error: 'Date parameter is required'
      })
    }

    const targetDate = new Date(dateParam)
    const startOfDay = new Date(targetDate)
    startOfDay.setHours(0, 0, 0, 0)
    const endOfDay = new Date(targetDate)
    endOfDay.setHours(23, 59, 59, 999)

    // Check if Google Calendar is configured
    const credentials = await getGoogleCalendarCredentials()
    
    if (!credentials) {
      // Return empty events if not configured
      return NextResponse.json({
        success: true,
        events: [],
        blockedSlots: [],
        message: 'Google Calendar not configured'
      })
    }

    // Fetch events from Google Calendar
    const calendarService = new GoogleCalendarService()
    await calendarService.authenticate(credentials)
    
    const allEvents = await calendarService.getEvents(startOfDay, endOfDay, credentials.calendarId)
    
    // Filter out shuttle trip events (created by the app itself)
    // Shuttle events have summary starting with "DRIVE:"
    const events = allEvents.filter((event: any) => {
      const summary = event.summary || ''
      const isShuttleEvent = summary.startsWith('DRIVE:')
      if (isShuttleEvent) {
        console.log(`Filtering out shuttle event: ${summary}`)
      }
      return !isShuttleEvent
    })
    
    const filteredCount = allEvents.length - events.length
    if (filteredCount > 0) {
      console.log(`Filtered out ${filteredCount} shuttle events from personal events blocking`)
    }
    
    // Process events to determine blocked shuttle slots
    const processedEvents = events.map(event => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyEvent = event as any
      const start = new Date(anyEvent.start?.dateTime || anyEvent.start?.date)
      const end = new Date(anyEvent.end?.dateTime || anyEvent.end?.date)
      
      // Calculate which 20-minute shuttle slots this event blocks
      const blockedSlots = []
      for (let hour = 7; hour < 18; hour++) {
        for (let minute = 0; minute < 60; minute += 20) {
          const slotStart = new Date(startOfDay)
          slotStart.setHours(hour, minute, 0, 0)
          const slotEnd = new Date(slotStart.getTime() + 20 * 60 * 1000)
          
          // Check if this personal event overlaps with this shuttle slot
          if (start < slotEnd && end > slotStart) {
            const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
            blockedSlots.push(timeSlot)
          }
        }
      }
      
      return {
        id: anyEvent.id,
        summary: anyEvent.summary || 'Personal Event',
        start: start.toISOString(),
        end: end.toISOString(),
        duration: (end.getTime() - start.getTime()) / (1000 * 60),
        blockedSlots
      }
    })

    // Get all blocked slots across all events
    const allBlockedSlots = [...new Set(processedEvents.flatMap(e => e.blockedSlots))]

    return NextResponse.json({
      success: true,
      date: targetDate.toDateString(),
      events: processedEvents,
      blockedSlots: allBlockedSlots,
      totalEvents: processedEvents.length,
      totalBlockedSlots: allBlockedSlots.length,
      totalFetchedEvents: allEvents.length,
      shuttleEventsFiltered: filteredCount
    })

  } catch (error) {
    console.error('Error fetching personal events:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}