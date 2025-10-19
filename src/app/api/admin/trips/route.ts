import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay } from 'date-fns'
import { autoAssignDriver } from '@/lib/driver-assignment'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const {
      destinationId,
      customDestination,
      startTime,
      endTime,
      maxPassengers,
      cityId,
      areaId,
      autoAssign = true // Option to auto-assign driver
    } = await request.json()

    if ((!destinationId && !customDestination) || !startTime) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    let finalDestinationId = destinationId;
    let finalCityId = cityId;
    let finalAreaId = areaId;
    let calculatedEndTime = endTime;

    // If custom destination, create it first
    if (!destinationId && customDestination) {
      const customLoc = await prisma.location.create({
        data: {
          name: 'Custom Destination',
          address: customDestination,
          isFrequent: false,
          cityId: finalCityId || null,
          areaId: finalAreaId || null
        }
      });
      finalDestinationId = customLoc.id;
    }

    // Get destination details to check for default duration and city/area
    const destination = await prisma.location.findUnique({
      where: { id: finalDestinationId },
      include: {
        city: true,
        area: true
      }
    });

    if (!destination) {
      return NextResponse.json(
        { error: 'Destination not found' },
        { status: 404 }
      )
    }

    // Use destination's city/area if not provided
    if (!finalCityId && destination.cityId) {
      finalCityId = destination.cityId
    }
    if (!finalAreaId && destination.areaId) {
      finalAreaId = destination.areaId
    }

    // Warn if no city/area (for backward compatibility)
    if (!finalCityId || !finalAreaId) {
      console.warn('[TRIP CREATION] No city/area specified - driver auto-assignment will be skipped')
    }

    // Calculate endTime based on destination's defaultDuration if available
    if (destination.defaultDuration && !endTime) {
      const startDate = new Date(startTime);
      const endDate = new Date(startDate.getTime() + destination.defaultDuration * 60000);
      calculatedEndTime = endDate.toISOString();
      console.log(`[TRIP CREATION] Auto-calculated endTime for ${destination.name}: ${destination.defaultDuration} minutes`);
    } else if (!calculatedEndTime) {
      return NextResponse.json(
        { error: 'End time is required for destinations without default duration' },
        { status: 400 }
      )
    }

    // Check if ANY trip already exists for this time slot
    const existingTrip = await prisma.trip.findFirst({
      where: {
        startTime: new Date(startTime),
        endTime: new Date(calculatedEndTime),
      },
      include: {
        destination: true,
        bookings: {
          where: { status: 'CONFIRMED' }
        },
        assignments: {
          where: {
            status: {
              in: ['ASSIGNED', 'ACCEPTED']
            }
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

    // Create the trip
    const trip = await prisma.trip.create({
      data: {
        destinationId: finalDestinationId,
        startTime: new Date(startTime),
        endTime: new Date(calculatedEndTime),
        maxPassengers: maxPassengers || 4,
        currentPassengers: 0,
        status: 'SCHEDULED',
        cityId: finalCityId,
        areaId: finalAreaId
      },
      include: {
        destination: true,
        city: true,
        area: true
      },
    })

    // Auto-assign driver if enabled and city/area are available
    let driverAssignment = null
    if (autoAssign && finalCityId && finalAreaId) {
      console.log(`[TRIP CREATION] Auto-assigning driver for trip ${trip.id}`)

      const assignmentResult = await autoAssignDriver({
        tripId: trip.id,
        cityId: finalCityId,
        areaId: finalAreaId,
        startTime: new Date(startTime),
        endTime: new Date(calculatedEndTime),
        assignedBy: session.user.id
      })

      if (assignmentResult.success) {
        console.log(`[TRIP CREATION] Driver assigned: ${assignmentResult.driverName}`)
        driverAssignment = {
          driverId: assignmentResult.driverId,
          driverName: assignmentResult.driverName,
          vehicleInfo: assignmentResult.vehicleInfo
        }
      } else {
        console.warn(`[TRIP CREATION] Driver assignment failed: ${assignmentResult.message}`)
      }
    }

    return NextResponse.json({
      ...trip,
      driverAssignment
    })

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