/**
 * Driver Performance Insights API
 * GET /api/driver/insights
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getPerformanceInsights } from '@/lib/driver-metrics'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get driver profile
    const { prisma } = await import('@/lib/prisma')
    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId: session.user.id }
    })

    if (!driverProfile) {
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 404 }
      )
    }

    // Get insights
    const insights = await getPerformanceInsights(driverProfile.id)

    return NextResponse.json({
      success: true,
      insights
    })
  } catch (error) {
    console.error('Error fetching driver insights:', error)
    return NextResponse.json(
      { error: 'Failed to fetch insights' },
      { status: 500 }
    )
  }
}
