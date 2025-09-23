import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendBookingConfirmation } from '@/lib/email'
import { createBookingConfirmation } from '@/lib/notifications'
import { AuditLogger } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const bookings = await prisma.booking.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        rider: {
          select: {
            id: true,
            name: true
          }
        },
        trip: {
          include: {
            destination: {
              select: {
                name: true,
                address: true
              }
            }
          }
        },
        pickupLocation: {
          select: {
            name: true,
            address: true
          }
        },
        dropoffLocation: {
          select: {
            name: true,
            address: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(bookings)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { userId, tripId, pickupLocation, dropoffLocation, riderId, adminOverride } = await request.json()

    if (!userId || !tripId || !pickupLocation) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, tripId, pickupLocation' },
        { status: 400 }
      )
    }

    // Auto-calculate passenger count as 1 per booking
    const passengerCount = 1

    // Get trip details
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        bookings: {
          where: { status: 'CONFIRMED' }
        },
        destination: true
      }
    })

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { creditBalance: true }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check for duplicate booking for this rider on this trip
    const existingBooking = await prisma.booking.findFirst({
      where: {
        tripId,
        userId,
        riderId: riderId || null,
        status: 'CONFIRMED'
      }
    })

    if (existingBooking) {
      const riderName = riderId ? 
        (await prisma.rider.findUnique({ where: { id: riderId } }))?.name || 'Unknown rider' :
        'User'
      return NextResponse.json(
        { error: `${riderName} is already booked for this trip` },
        { status: 400 }
      )
    }

    // Calculate current passengers
    const currentPassengers = trip.bookings.reduce((total, booking) => {
      return total + booking.passengerCount
    }, 0)

    // Check if enough seats available
    if (currentPassengers + passengerCount > trip.maxPassengers) {
      return NextResponse.json(
        { error: 'Not enough seats available' },
        { status: 400 }
      )
    }

    // Handle location creation for custom addresses
    let pickupLocationId = pickupLocation
    let dropoffLocationId = dropoffLocation || pickupLocation

    // If pickup is not a valid ID (custom address), create location
    if (!pickupLocation.startsWith('clv') && !pickupLocation.startsWith('cm')) {
      const pickupLoc = await prisma.location.create({
        data: {
          name: 'Admin Custom Pickup',
          address: pickupLocation,
          isFrequent: false,
        }
      })
      pickupLocationId = pickupLoc.id
    }

    // If dropoff is not a valid ID (custom address), create location
    if (dropoffLocation && !dropoffLocation.startsWith('clv') && !dropoffLocation.startsWith('cm')) {
      const dropoffLoc = await prisma.location.create({
        data: {
          name: 'Admin Custom Dropoff',
          address: dropoffLocation,
          isFrequent: false,
        }
      })
      dropoffLocationId = dropoffLoc.id
    }

    // Calculate cost - free for admin bookings or check credits
    const totalCost = adminOverride ? 0 : passengerCount

    // Create booking in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Re-check availability within transaction
      const currentTrip = await tx.trip.findUnique({
        where: { id: tripId },
        include: {
          bookings: {
            where: { status: 'CONFIRMED' }
          }
        }
      })

      if (!currentTrip) {
        throw new Error('Trip not found')
      }

      const currentPassengers = currentTrip.bookings.reduce((total, booking) => {
        return total + booking.passengerCount
      }, 0)

      if (currentPassengers + passengerCount > currentTrip.maxPassengers) {
        throw new Error(`Not enough seats available. Current: ${currentPassengers}/${currentTrip.maxPassengers}, Requested: ${passengerCount}`)
      }

      // Create the booking
      const booking = await tx.booking.create({
        data: {
          userId,
          tripId,
          riderId: riderId || null,
          pickupLocationId,
          dropoffLocationId,
          passengerCount,
          creditsCost: totalCost,
          status: 'CONFIRMED',
          notes: adminOverride ? 'Admin booking - no credit charge' : undefined
        },
        include: {
          trip: {
            include: {
              destination: true,
            }
          },
          rider: true,
          pickupLocation: true,
          pickupSavedAddress: true,
          dropoffLocation: true,
          user: true
        }
      })

      // Deduct credits only if not admin override and user has credits
      if (!adminOverride && totalCost > 0) {
        if (!user.creditBalance || user.creditBalance.credits < totalCost) {
          throw new Error('Insufficient credits')
        }

        await tx.creditBalance.update({
          where: { userId },
          data: {
            credits: {
              decrement: totalCost,
            }
          }
        })

        // Create credit transaction record
        await tx.creditTransaction.create({
          data: {
            userId,
            type: 'USAGE',
            amount: -totalCost,
            description: `Admin booking for ${booking.trip.destination.name} - ${booking.rider?.name || 'User'}`,
          }
        })
      }

      return booking
    })

    // Auto-sync to calendar if enabled
    try {
      const calendarSyncSetting = await prisma.settings.findUnique({
        where: { key: 'calendar_sync_enabled' }
      })
      
      const isAutoSyncEnabled = calendarSyncSetting?.value !== 'false'
      
      if (isAutoSyncEnabled) {
        console.log(`Starting trip calendar sync for admin booking trip ${result.tripId}`)
        const { syncTripToCalendar } = await import('@/lib/calendar-auto-sync')
        const syncResult = await syncTripToCalendar(result.tripId)
        console.log(`Trip calendar sync result for admin booking trip ${result.tripId}:`, syncResult)
      }
    } catch (calendarError) {
      console.error('Failed to auto-sync admin booking to calendar:', calendarError)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error creating admin booking:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}