/**
 * Report Rating API
 * POST /api/ratings/[ratingId]/report
 * Report a rating as inappropriate
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { reportRating } from '@/lib/rating-logic'

export async function POST(
  request: NextRequest,
  { params }: { params: { ratingId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { ratingId } = params
    const body = await request.json()
    const { reason } = body

    if (!reason) {
      return NextResponse.json(
        { error: 'Reason is required' },
        { status: 400 }
      )
    }

    const rating = await reportRating(ratingId, session.user.id, reason)

    return NextResponse.json({
      success: true,
      message: 'Rating reported successfully. Admins will review it.',
      rating: {
        id: rating.id,
        isReported: rating.isReported
      }
    })
  } catch (error) {
    console.error('Error reporting rating:', error)
    return NextResponse.json(
      { error: 'Failed to report rating' },
      { status: 500 }
    )
  }
}
