/**
 * Complete Trip API
 * POST /api/driver/trips/[assignmentId]/complete
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { completeTrip } from '@/lib/driver-operations'

export async function POST(
  request: NextRequest,
  { params }: { params: { assignmentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'DRIVER') {
      return NextResponse.json(
        { error: 'Unauthorized: Driver access required' },
        { status: 401 }
      )
    }

    const driverId = session.user.driverProfileId
    if (!driverId) {
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 404 }
      )
    }

    const { assignmentId } = params
    const body = await request.json().catch(() => ({}))
    const { distance, duration, location } = body

    // Complete the trip
    const result = await completeTrip(assignmentId, driverId, {
      distance,
      duration,
      location
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to complete trip' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      assignment: result.assignment,
      statusHistory: result.statusHistory
    })
  } catch (error) {
    console.error('Error completing trip:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
