import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { getAuthorizationUrl } from '@/lib/calendar-integration'

/**
 * GET /api/driver/calendar/connect
 * Initiate Google Calendar OAuth flow
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

    // Generate authorization URL
    const authUrl = getAuthorizationUrl(driverId)

    return NextResponse.json({
      success: true,
      authUrl
    })

  } catch (error) {
    console.error('Error initiating calendar connection:', error)
    return NextResponse.json(
      { error: 'Failed to initiate calendar connection' },
      { status: 500 }
    )
  }
}
