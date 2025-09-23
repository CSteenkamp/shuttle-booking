import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { userId } = params

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        bookings: {
          where: {
            status: 'CONFIRMED',
            trip: {
              status: 'SCHEDULED'
            }
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Cancel all future bookings
    for (const booking of user.bookings) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CANCELLED' }
      })

      // Refund credits
      await prisma.creditTransaction.create({
        data: {
          userId: booking.userId,
          type: 'REFUND',
          amount: booking.creditsCost,
          description: 'Refund due to account suspension'
        }
      })

      // Update credit balance
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

    // Update user status to suspended
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'SUSPENDED' }
    })

    return NextResponse.json({
      message: 'User suspended successfully',
      cancelledBookings: user.bookings.length
    })
  } catch (error) {
    console.error('Error suspending user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}