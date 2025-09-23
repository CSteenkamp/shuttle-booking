import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { tripId } = params

    // First get the trip to check if it exists and get bookings
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        bookings: {
          include: {
            user: true
          }
        }
      }
    })

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    // Update trip status to CANCELLED
    await prisma.trip.update({
      where: { id: tripId },
      data: {
        status: 'CANCELLED'
      }
    })

    // Cancel all associated bookings and refund credits
    for (const booking of trip.bookings) {
      if (booking.status === 'CONFIRMED') {
        // Cancel the booking
        await prisma.booking.update({
          where: { id: booking.id },
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
            description: `Refund for cancelled trip`
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
      }
    }

    // TODO: Send cancellation emails to all passengers here
    // This would integrate with the existing email system

    return NextResponse.json({ 
      message: 'Trip cancelled successfully',
      refundedBookings: trip.bookings.length
    })
  } catch (error) {
    console.error('Error cancelling trip:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}