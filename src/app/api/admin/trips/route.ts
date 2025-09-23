import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { destinationId, customDestination, startTime, endTime, maxPassengers } = await request.json()

    if ((!destinationId && !customDestination) || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    let finalDestinationId = destinationId;

    // If custom destination, create it first
    if (!destinationId && customDestination) {
      const customLoc = await prisma.location.create({
        data: {
          name: 'Custom Destination',
          address: customDestination,
          isFrequent: false,
        }
      });
      finalDestinationId = customLoc.id;
    }

    // Check if ANY trip already exists for this time slot (destination is locked)
    const existingTrip = await prisma.trip.findFirst({
      where: {
        startTime: new Date(startTime),
        endTime: new Date(endTime),
      },
      include: {
        destination: true,
        bookings: {
          where: { status: 'CONFIRMED' }
        }
      }
    })

    if (existingTrip) {
      // If trip exists with different destination, reject
      if (existingTrip.destinationId !== finalDestinationId) {
        return NextResponse.json(
          { error: `Time slot is locked for ${existingTrip.destination.name}. Cannot create trip to different destination.` },
          { status: 409 }
        )
      }
      
      // If same destination, return the existing trip
      return NextResponse.json(existingTrip)
    }

    const trip = await prisma.trip.create({
      data: {
        destinationId: finalDestinationId,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        maxPassengers: maxPassengers || 4,
        currentPassengers: 0,
        status: 'SCHEDULED',
      },
      include: {
        destination: true,
      },
    })

    return NextResponse.json(trip)
  } catch (error) {
    console.error('Error creating trip:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')

    if (!dateParam) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      )
    }

    const date = new Date(dateParam)
    const startOfSelectedDay = startOfDay(date)
    const endOfSelectedDay = endOfDay(date)

    const trips = await prisma.trip.findMany({
      where: {
        startTime: {
          gte: startOfSelectedDay,
          lte: endOfSelectedDay,
        },
      },
      include: {
        destination: true,
        bookings: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            pickupLocation: true,
          pickupSavedAddress: true,
            dropoffLocation: true,
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    })

    return NextResponse.json(trips)
  } catch (error) {
    console.error('Error fetching trips:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}