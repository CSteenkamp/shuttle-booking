import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { GoogleCalendarService, getGoogleCalendarCredentials } from '@/lib/google-calendar'

export async function GET() {
  try {
    console.log('📅 Testing Personal Events Detection...')

    // Check Google Calendar configuration
    const credentials = await getGoogleCalendarCredentials()
    
    if (!credentials) {
      return NextResponse.json({
        success: false,
        error: 'Google Calendar not configured',
        message: 'Service account or calendar ID missing'
      })
    }

    console.log('✅ Google Calendar credentials found')
    console.log('Calendar ID:', credentials.calendarId)

    // Initialize Google Calendar service
    const calendarService = new GoogleCalendarService()
    await calendarService.authenticate(credentials)
    
    console.log('✅ Successfully authenticated with Google Calendar')

    // Get today's events
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    console.log(`📋 Fetching events for today (${today.toDateString()})...`)

    const events = await calendarService.getEvents(today, tomorrow, credentials.calendarId)
    
    console.log(`Found ${events.length} events today`)

    // Process events and check which shuttle slots they would block
    const processedEvents = events.map(event => {
      const start = new Date(event.start?.dateTime || event.start?.date || '')
      const end = new Date(event.end?.dateTime || event.end?.date || '')
      
      // Calculate which 20-minute shuttle slots this event would block
      const blockedSlots = []
      for (let hour = 7; hour < 18; hour++) {
        for (let minute = 0; minute < 60; minute += 20) {
          const slotStart = new Date(today)
          slotStart.setHours(hour, minute, 0, 0)
          const slotEnd = new Date(slotStart.getTime() + 20 * 60 * 1000)
          
          if (start < slotEnd && end > slotStart) {
            const timeSlot = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
            blockedSlots.push(timeSlot)
          }
        }
      }
      
      return {
        id: event.id,
        summary: event.summary || 'No title',
        start: start.toISOString(),
        end: end.toISOString(),
        duration: (end.getTime() - start.getTime()) / (1000 * 60),
        blockedShuttleSlots: blockedSlots
      }
    })

    // Check specifically for 12pm events (your test event)
    const noon = new Date(today)
    noon.setHours(12, 0, 0, 0)
    const onepm = new Date(today)
    onepm.setHours(13, 0, 0, 0)

    const noonEvents = processedEvents.filter(event => {
      const eventStart = new Date(event.start)
      const eventEnd = new Date(event.end)
      return eventStart < onepm && eventEnd > noon
    })

    const result = {
      success: true,
      calendarId: credentials.calendarId,
      today: today.toDateString(),
      totalEvents: events.length,
      events: processedEvents,
      noonEvents: noonEvents.length,
      hasNoonEvent: noonEvents.length > 0,
      message: noonEvents.length > 0 
        ? '✅ Found personal event at 12pm! This will block shuttle bookings.' 
        : '❌ No events found at 12pm. Please check your personal event.',
      totalBlockedSlots: [...new Set(processedEvents.flatMap(e => e.blockedShuttleSlots))].length
    }

    console.log('Test result:', result.message)
    
    return NextResponse.json(result)

  } catch (error) {
    console.error('❌ Error testing personal events:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    })
  }
}