/**
 * Can Rate Booking API
 * GET /api/bookings/[bookingId]/can-rate?role=CUSTOMER_RATING_DRIVER
 * Check if user can rate a booking
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { canRateBooking } from '@/lib/rating-logic'
import { RatingRole } from '@prisma/client'

export async function GET(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { bookingId } = params
    const searchParams = request.nextUrl.searchParams
    const roleParam = searchParams.get('role')

    if (!roleParam || !Object.values(RatingRole).includes(roleParam as RatingRole)) {
      return NextResponse.json(
        { error: 'Invalid or missing role parameter' },
        { status: 400 }
      )
    }

    const role = roleParam as RatingRole

    const result = await canRateBooking(bookingId, session.user.id, role)

    return NextResponse.json({
      ...result
    })
  } catch (error) {
    console.error('Error checking can rate:', error)
    return NextResponse.json(
      { error: 'Failed to check rating eligibility' },
      { status: 500 }
    )
  }
}
