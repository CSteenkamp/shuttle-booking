/**
 * Driver Trips API
 * GET /api/driver/trips - List driver's assigned trips
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDriverTrips } from '@/lib/driver-operations'
import { AssignmentStatus } from '@prisma/client'

export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const statusParam = searchParams.get('status')
    const includeCompleted = searchParams.get('includeCompleted') === 'true'
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    // Parse status filter
    let statusFilter: AssignmentStatus[] | undefined
    if (statusParam) {
      const statuses = statusParam.split(',') as AssignmentStatus[]
      statusFilter = statuses
    }

    // Fetch trips
    const trips = await getDriverTrips(driverId, {
      status: statusFilter,
      includeCompleted,
      limit
    })

    return NextResponse.json({
      success: true,
      trips,
      count: trips.length
    })
  } catch (error) {
    console.error('Error fetching driver trips:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trips' },
      { status: 500 }
    )
  }
}
