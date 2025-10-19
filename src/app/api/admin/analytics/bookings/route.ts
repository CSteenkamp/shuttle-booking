/**
 * Booking Trends API
 * GET /api/admin/analytics/bookings?days=30
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getBookingTrends } from '@/lib/admin-analytics'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30', 10)

    const data = await getBookingTrends(days)

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('Error fetching booking trends:', error)
    return NextResponse.json(
      { error: 'Failed to fetch booking trends' },
      { status: 500 }
    )
  }
}
