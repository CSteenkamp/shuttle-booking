/**
 * City Leaderboard API
 * GET /api/leaderboard/[cityId]?metric=trips|rating|earnings&limit=10
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getCityLeaderboard } from '@/lib/driver-metrics'

export async function GET(
  request: NextRequest,
  { params }: { params: { cityId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const metric = (searchParams.get('metric') as 'trips' | 'rating' | 'earnings') || 'trips'
    const limit = parseInt(searchParams.get('limit') || '10', 10)

    // Validate metric
    if (!['trips', 'rating', 'earnings'].includes(metric)) {
      return NextResponse.json(
        { error: 'Invalid metric. Must be: trips, rating, or earnings' },
        { status: 400 }
      )
    }

    // Get leaderboard
    const leaderboard = await getCityLeaderboard(params.cityId, metric, limit)

    return NextResponse.json({
      success: true,
      leaderboard,
      metric,
      cityId: params.cityId
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    )
  }
}
