/**
 * Ratings API
 * POST /api/ratings - Submit a rating
 * GET /api/ratings - Get user's ratings
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { submitRating, getUserRatings, canRateBooking } from '@/lib/rating-logic'
import { RatingRole } from '@prisma/client'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { bookingId, stars, comment, tags, role } = body

    if (!bookingId || !stars || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: bookingId, stars, role' },
        { status: 400 }
      )
    }

    // Validate role
    if (!Object.values(RatingRole).includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Check if user can rate this booking
    const canRate = await canRateBooking(bookingId, session.user.id, role)
    if (!canRate.canRate) {
      return NextResponse.json(
        { error: canRate.reason || 'Cannot rate this booking' },
        { status: 400 }
      )
    }

    // Fetch booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        trip: {
          include: {
            assignments: {
              where: {
                status: 'COMPLETED'
              },
              include: {
                driver: {
                  include: {
                    user: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Determine ratedUserId and ratedDriverId based on role
    let ratedUserId: string
    let ratedDriverId: string | undefined

    if (role === RatingRole.CUSTOMER_RATING_DRIVER) {
      // Customer rating driver
      const assignment = booking.trip.assignments[0]
      if (!assignment) {
        return NextResponse.json(
          { error: 'No driver assigned to this trip' },
          { status: 400 }
        )
      }
      ratedUserId = assignment.driver.userId
      ratedDriverId = assignment.driverId
    } else {
      // Driver rating customer
      ratedUserId = booking.userId
      ratedDriverId = undefined
    }

    // Submit rating
    const rating = await submitRating({
      bookingId,
      tripId: booking.tripId,
      raterId: session.user.id,
      ratedUserId,
      ratedDriverId,
      role,
      stars,
      comment,
      tags
    })

    return NextResponse.json({
      success: true,
      rating: {
        id: rating.id,
        stars: rating.stars,
        comment: rating.comment,
        tags: rating.tags,
        createdAt: rating.createdAt
      },
      message: 'Rating submitted successfully'
    })
  } catch (error: any) {
    console.error('Error submitting rating:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to submit rating' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const roleParam = searchParams.get('role')

    let role: RatingRole | undefined
    if (roleParam && Object.values(RatingRole).includes(roleParam as RatingRole)) {
      role = roleParam as RatingRole
    }

    const ratings = await getUserRatings(session.user.id, role)

    return NextResponse.json({
      success: true,
      ratings: ratings.map(r => ({
        id: r.id,
        bookingId: r.bookingId,
        tripId: r.tripId,
        role: r.role,
        stars: r.stars,
        comment: r.comment,
        tags: r.tags,
        createdAt: r.createdAt,
        trip: r.trip
      })),
      count: ratings.length
    })
  } catch (error) {
    console.error('Error fetching ratings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ratings' },
      { status: 500 }
    )
  }
}
