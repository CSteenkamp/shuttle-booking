import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    
    if (!dateParam) {
      return NextResponse.json({
        success: false,
        error: 'Date parameter is required'
      })
    }

    // This endpoint can be called by the frontend to force a refresh
    // The actual personal events API will fetch fresh data from Google Calendar
    const personalEventsUrl = new URL('/api/calendar/personal-events', request.url)
    personalEventsUrl.searchParams.set('date', dateParam)
    
    const response = await fetch(personalEventsUrl.toString())
    const data = await response.json()
    
    return NextResponse.json({
      success: true,
      refreshed: true,
      timestamp: new Date().toISOString(),
      ...data
    })

  } catch (error) {
    console.error('Error refreshing calendar events:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}