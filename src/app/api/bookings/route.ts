import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendBookingConfirmation } from '@/lib/email'
import { createBookingConfirmation } from '@/lib/notifications'
import { AuditLogger } from '@/lib/audit'
import { createBookingWithCalendarSync } from '@/lib/booking-integration'
import { calculateTripCost } from '@/lib/pricing'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is suspended
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (user?.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Account suspended. Please contact support.' },
        { status: 403 }
      )
    }

    const { tripId, pickupLocation, dropoffLocation, riderId } = await request.json()

    if (!tripId || !pickupLocation || !dropoffLocation) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Auto-calculate passenger count as 1 per booking
    const passengerCount = 1

    // Get trip details
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        destination: true,
        bookings: {
          where: { status: 'CONFIRMED' }
        }
      }
    })

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    // Check for duplicate booking for this rider on this trip
    const existingBooking = await prisma.booking.findFirst({
      where: {
        tripId,
        userId: session.user.id,
        riderId: riderId || null,
        status: 'CONFIRMED'
      }
    })

    if (existingBooking) {
      const riderName = riderId ? 
        (await prisma.rider.findUnique({ where: { id: riderId } }))?.name || 'Unknown rider' :
        'You'
      return NextResponse.json(
        { error: `${riderName} ${riderId ? 'is' : 'are'} already booked for this trip` },
        { status: 400 }
      )
    }

    // Calculate current passengers and new total
    const currentPassengers = trip.bookings.reduce((total, booking) => {
      return total + booking.passengerCount
    }, 0)
    const newTotalPassengers = currentPassengers + passengerCount

    // Check if enough seats available
    if (newTotalPassengers > trip.maxPassengers) {
      return NextResponse.json(
        { error: 'Not enough seats available' },
        { status: 400 }
      )
    }

    // Calculate dynamic pricing
    const pricingInfo = await calculateTripCost(trip.destinationId, newTotalPassengers)
    const totalCost = pricingInfo ? pricingInfo.costPerPerson : passengerCount // fallback to old system

    console.log(`[BOOKING API] Trip to ${trip.destination.name}: ${currentPassengers} -> ${newTotalPassengers} passengers, cost: R${totalCost}`)

    // Check credit balance (admins have unlimited credits)
    let creditBalance = null

    if (session.user.role !== 'ADMIN') {
      creditBalance = await prisma.creditBalance.findUnique({
        where: { userId: session.user.id }
      })

      if (!creditBalance) {
        return NextResponse.json(
          { error: 'Credit balance not found' },
          { status: 400 }
        )
      }

      if (creditBalance.credits < totalCost) {
        return NextResponse.json(
          { error: 'Insufficient credits' },
          { status: 400 }
        )
      }
    }

    // Handle location creation for custom addresses before calling integrated function
    let pickupLocationId: string | null = null
    let pickupSavedAddressId: string | null = null
    let dropoffLocationId = dropoffLocation

    // If pickup is not a valid ID (custom address), create saved address for user
    if (!pickupLocation.startsWith('clv') && !pickupLocation.startsWith('cm')) {
      // Check if this address already exists for the user
      const existingSavedAddress = await prisma.savedAddress.findFirst({
        where: {
          userId: session.user.id,
          address: pickupLocation
        }
      })

      if (existingSavedAddress) {
        pickupSavedAddressId = existingSavedAddress.id
      } else {
        // Create new saved address for this user
        const savedAddress = await prisma.savedAddress.create({
          data: {
            userId: session.user.id,
            name: `Pickup - ${pickupLocation.substring(0, 30)}...`,
            address: pickupLocation,
            isDefault: false
          }
        })
        pickupSavedAddressId = savedAddress.id
      }
    } else {
      // It's a valid location ID
      pickupLocationId = pickupLocation
    }

    // If dropoff is not a valid ID (custom address), create location
    if (!dropoffLocation.startsWith('clv') && !dropoffLocation.startsWith('cm')) {
      const dropoffLoc = await prisma.location.create({
        data: {
          name: 'Custom Dropoff',
          address: dropoffLocation,
          isFrequent: false,
        }
      })
      dropoffLocationId = dropoffLoc.id
    }

    // Use the integrated booking function that handles calendar sync
    console.log('[BOOKING API] Using createBookingWithCalendarSync with params:', {
      userId: session.user.id,
      tripId,
      pickupLocationId,
      pickupSavedAddressId,
      dropoffLocationId,
      passengerCount,
      creditsCost: totalCost,
      riderId: riderId || undefined
    })
    
    const bookingResult = await createBookingWithCalendarSync({
      userId: session.user.id,
      tripId,
      pickupLocationId,
      pickupSavedAddressId,
      dropoffLocationId,
      passengerCount,
      creditsCost: totalCost,
      riderId: riderId || undefined
    })
    
    console.log('[BOOKING API] Booking result:', bookingResult)

    if (!bookingResult.success) {
      return NextResponse.json(
        { error: bookingResult.error },
        { status: 400 }
      )
    }

    // Get the created booking with all details
    const result = await prisma.booking.findUnique({
      where: { id: bookingResult.bookingId },
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
      }
    })

    if (!result) {
      return NextResponse.json(
        { error: 'Booking created but could not retrieve details' },
        { status: 500 }
      )
    }

    // Send booking confirmation email
    try {
      await sendBookingConfirmation({
        userEmail: session.user.email!,
        userName: session.user.name || session.user.email!.split('@')[0],
        tripDetails: {
          destination: result.trip.destination.name,
          destinationAddress: result.trip.destination.address,
          startTime: result.trip.startTime,
          endTime: result.trip.endTime,
          pickupAddress: result.pickupLocation.address,
          passengerCount: result.passengerCount,
          riderName: result.rider?.name,
          riderPhone: result.rider?.phone || undefined,
        },
        bookingId: result.id,
      })
      console.log(`Booking confirmation email sent for booking ${result.id}`)
    } catch (emailError) {
      // Don't fail the booking if email fails, just log the error
      console.error('Failed to send booking confirmation email:', emailError)
    }

    // Calendar sync is handled by createBookingWithCalendarSync
    if (bookingResult.warning) {
      console.log('Booking warning:', bookingResult.warning)
    }

    // Create notification for booking confirmation
    try {
      await createBookingConfirmation(
        session.user.id,
        result.id,
        `Your booking for ${result.trip.destination.name} has been confirmed! Trip starts at ${new Date(result.trip.startTime).toLocaleString()}.`
      )
      console.log(`Notification created for booking ${result.id}`)
    } catch (notificationError) {
      // Don't fail the booking if notification creation fails, just log the error
      console.error('Failed to create booking notification:', notificationError)
    }

    // Log the booking creation for audit trail
    try {
      await AuditLogger.logBookingAction(
        session.user.id,
        'CREATE',
        result.id,
        undefined,
        {
          tripId: result.tripId,
          destination: result.trip.destination.name,
          passengerCount: result.passengerCount,
          creditsCost: result.creditsCost,
          pickupLocation: result.pickupLocation.address,
          dropoffLocation: result.dropoffLocation.address,
          riderName: result.rider?.name
        },
        request
      )
    } catch (auditError) {
      console.error('Failed to create audit log for booking:', auditError)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error creating booking:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}