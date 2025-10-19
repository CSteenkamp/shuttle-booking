/**
 * Driver Status API
 * POST /api/driver/status - Toggle online/offline
 * GET /api/driver/status - Get current status
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { setDriverOnlineStatus } from '@/lib/driver-operations'
import { prisma } from '@/lib/prisma'

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

    // Get current status
    const driver = await prisma.driverProfile.findUnique({
      where: { id: driverId },
      select: {
        isOnline: true,
        isAvailable: true,
        status: true
      }
    })

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      status: {
        isOnline: driver.isOnline,
        isAvailable: driver.isAvailable,
        driverStatus: driver.status
      }
    })
  } catch (error) {
    console.error('Error fetching driver status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { isOnline } = body

    if (typeof isOnline !== 'boolean') {
      return NextResponse.json(
        { error: 'isOnline must be a boolean' },
        { status: 400 }
      )
    }

    // Update online status
    const result = await setDriverOnlineStatus(driverId, isOnline)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update status' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: isOnline ? 'You are now online' : 'You are now offline',
      driver: {
        isOnline: result.driver.isOnline,
        isAvailable: result.driver.isAvailable
      }
    })
  } catch (error) {
    console.error('Error updating driver status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
