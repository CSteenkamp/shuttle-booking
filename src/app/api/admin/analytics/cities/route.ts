/**
 * City Performance API
 * GET /api/admin/analytics/cities?limit=10
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCityPerformance } from '@/lib/admin-analytics'

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
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    const cities = await getCityPerformance(limit)

    return NextResponse.json({
      success: true,
      cities
    })
  } catch (error) {
    console.error('Error fetching city performance:', error)
    return NextResponse.json(
      { error: 'Failed to fetch city performance' },
      { status: 500 }
    )
  }
}
