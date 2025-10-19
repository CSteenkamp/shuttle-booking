/**
 * Driver Ratings API
 * GET /api/ratings/driver/[driverId] - Get driver ratings and statistics
 */

import { NextRequest, NextResponse } from 'next/server'
import { getDriverRatings } from '@/lib/rating-logic'

export async function GET(
  request: NextRequest,
  { params }: { params: { driverId: string } }
) {
  try {
    const { driverId } = params

    const result = await getDriverRatings(driverId)

    return NextResponse.json({
      success: true,
      ...result,
      ratings: result.ratings.map(r => ({
        id: r.id,
        stars: r.stars,
        comment: r.comment,
        tags: r.tags,
        createdAt: r.createdAt,
        trip: r.trip
      }))
    })
  } catch (error) {
    console.error('Error fetching driver ratings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch driver ratings' },
      { status: 500 }
    )
  }
}
