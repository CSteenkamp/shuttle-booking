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

    // Get Google Calendar credentials
    const credentials = await getGoogleCalendarCredentials()
    
    if (!credentials) {
      return NextResponse.json(
        { error: 'Google Calendar not configured. Please add Service Account JSON and Calendar ID in settings.' },
        { status: 400 }
      )
    }

    // Test authentication
    const calendarService = new GoogleCalendarService()
    await calendarService.authenticate(credentials)

    // Try to fetch a minimal amount of calendar data to test the connection
    const testDate = new Date()
    const endDate = new Date(testDate.getTime() + 60000) // 1 minute later
    
    await calendarService.getEvents(testDate, endDate, credentials.calendarId)

    return NextResponse.json({
      success: true,
      message: 'Google Calendar connection successful',
      calendarId: credentials.calendarId,
      serviceAccountEmail: JSON.parse(credentials.serviceAccountKey).client_email
    })

  } catch (error) {
    console.error('Calendar connection test failed:', error)
    
    let errorMessage = 'Unknown error occurred'
    if (error instanceof Error) {
      errorMessage = error.message
    }

    // Provide more specific error messages
    if (errorMessage.includes('authentication')) {
      errorMessage = 'Authentication failed. Please check your Service Account JSON credentials.'
    } else if (errorMessage.includes('calendar')) {
      errorMessage = 'Calendar access failed. Please verify the Calendar ID and ensure the service account has access to the calendar.'
    } else if (errorMessage.includes('permission') || errorMessage.includes('forbidden')) {
      errorMessage = 'Permission denied. Please share your calendar with the service account email and grant "Make changes to events" permission.'
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}