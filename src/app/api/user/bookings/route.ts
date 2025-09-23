import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const tripId = searchParams.get('tripId')

    let bookings

    if (tripId) {
      // Get bookings for a specific trip
      bookings = await prisma.booking.findMany({
        where: {
          userId: session.user.id,
          tripId: tripId,
          status: 'CONFIRMED'
        },
        include: {
          rider: true,
          trip: {
            include: {
              destination: true
            }
          },
          pickupLocation: true,
          pickupSavedAddress: true,
          dropoffLocation: true,
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })
    } else {
      // Get all user bookings
      bookings = await prisma.booking.findMany({
        where: {
          userId: session.user.id,
          status: 'CONFIRMED'
        },
        include: {
          rider: true,
          trip: {
            include: {
              destination: true
            }
          },
          pickupLocation: true,
          pickupSavedAddress: true,
          dropoffLocation: true,
          user: {
            select: {
              name: true,
              email: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    }

    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Error fetching user bookings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}