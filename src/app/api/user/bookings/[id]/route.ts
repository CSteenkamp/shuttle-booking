import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    const booking = await prisma.booking.findUnique({
      where: { 
        id,
        // Ensure users can only access their own bookings (unless admin)
        ...(session.user.role !== 'ADMIN' && { userId: session.user.id })
      },
      include: {
        trip: {
          include: {
            destination: true
          }
        },
        pickupLocation: true,
          pickupSavedAddress: true,
        dropoffLocation: true,
        rider: true,
        user: {
          select: {
            name: true,
            email: true
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

    return NextResponse.json(booking)
  } catch (error) {
    console.error('Error fetching booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}