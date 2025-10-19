/**
 * Booking Payment API
 * POST /api/bookings/[bookingId]/pay
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { initiateBookingPayment } from '@/lib/payfast'

export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify booking belongs to user
    const { prisma } = await import('@/lib/prisma')
    const booking = await prisma.booking.findUnique({
      where: { id: params.bookingId },
      select: { userId: true, status: true, paymentStatus: true }
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    if (booking.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    if (booking.paymentStatus === 'PAID') {
      return NextResponse.json(
        { error: 'Booking already paid' },
        { status: 400 }
      )
    }

    const result = await initiateBookingPayment(params.bookingId)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to initiate payment' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      paymentUrl: result.paymentUrl
    })
  } catch (error) {
    console.error('Error initiating booking payment:', error)
    return NextResponse.json(
      { error: 'Failed to initiate payment' },
      { status: 500 }
    )
  }
}
