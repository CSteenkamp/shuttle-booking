import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, addDays } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const weekParam = searchParams.get('week')

    let startDate: Date
    let endDate: Date

    if (weekParam) {
      // Fetch trips for the entire week (Monday to Friday)
      startDate = startOfDay(new Date(weekParam))
      endDate = endOfDay(addDays(startDate, 6)) // Full week
    } else if (dateParam) {
      // Fetch trips for a specific date (legacy support)
      const date = new Date(dateParam)
      startDate = startOfDay(date)
      endDate = endOfDay(date)
    } else {
      return NextResponse.json(
        { error: 'Date or week parameter is required' },
        { status: 400 }
      )
    }

    const trips = await prisma.trip.findMany({
      where: {
        startTime: {
          gte: startDate,
          lte: endDate,
        },
        status: 'SCHEDULED',
      },
      include: {
        destination: true,
        bookings: true,
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    // Calculate current passengers for each trip
    const tripsWithCounts = trips.map(trip => ({
      ...trip,
      currentPassengers: trip.bookings.reduce((total, booking) => {
        return total + (booking.status === 'CONFIRMED' ? booking.passengerCount : 0)
      }, 0)
    }))

    return NextResponse.json(tripsWithCounts)
  } catch (error) {
    console.error('Error fetching trips:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}