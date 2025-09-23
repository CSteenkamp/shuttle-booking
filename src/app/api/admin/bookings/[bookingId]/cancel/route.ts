import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { bookingId } = params

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: true,
        trip: true
      }
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    if (booking.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Booking is already cancelled' },
        { status: 400 }
      )
    }

    // Cancel the booking
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED'
      }
    })

    // Refund credits
    await prisma.creditTransaction.create({
      data: {
        userId: booking.userId,
        type: 'REFUND',
        amount: booking.creditsCost,
        description: `Admin cancellation refund for booking ${bookingId}`
      }
    })

    // Update user credit balance
    await prisma.creditBalance.upsert({
      where: { userId: booking.userId },
      create: {
        userId: booking.userId,
        credits: booking.creditsCost
      },
      update: {
        credits: {
          increment: booking.creditsCost
        }
      }
    })

    // Update trip passenger count
    await prisma.trip.update({
      where: { id: booking.tripId },
      data: {
        currentPassengers: {
          decrement: 1
        }
      }
    })

    // TODO: Send cancellation email notification here

    return NextResponse.json({
      message: 'Booking cancelled and credits refunded successfully',
      refundedCredits: booking.creditsCost
    })
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}