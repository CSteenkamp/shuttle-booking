import { NextRequest, NextResponse } from 'next/server'
import { connectCalendar } from '@/lib/calendar-integration'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/driver/calendar/callback
 * Handle Google Calendar OAuth callback
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // This is the driverId we passed
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error)
      return NextResponse.redirect(
        new URL(`/driver/dashboard?calendar_error=${encodeURIComponent(error)}`, request.url)
      )
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL('/driver/dashboard?calendar_error=missing_params', request.url)
      )
    }

    const driverId = state

    // Verify driver exists
    const driver = await prisma.driverProfile.findUnique({
      where: { id: driverId }
    })

    if (!driver) {
      return NextResponse.redirect(
        new URL('/driver/dashboard?calendar_error=driver_not_found', request.url)
      )
    }

    // Exchange code for tokens and store connection
    await connectCalendar(driverId, code)

    // Redirect back to driver dashboard with success message
    return NextResponse.redirect(
      new URL('/driver/dashboard?calendar_connected=true', request.url)
    )

  } catch (error) {
    console.error('Error in calendar callback:', error)
    return NextResponse.redirect(
      new URL(`/driver/dashboard?calendar_error=${encodeURIComponent('connection_failed')}`, request.url)
    )
  }
}
