/**
 * Accept Trip Assignment API
 * POST /api/driver/trips/[assignmentId]/accept
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { acceptTripAssignment } from '@/lib/driver-operations'

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

    // Accept the assignment
    const result = await acceptTripAssignment(assignmentId, driverId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to accept trip' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      assignment: result.assignment
    })
  } catch (error) {
    console.error('Error accepting trip:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
