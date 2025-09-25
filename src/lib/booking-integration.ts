import { prisma } from '@/lib/prisma'
import { checkTimeSlotAvailability } from '@/lib/availability-checker'
import { GoogleCalendarService, getGoogleCalendarCredentials, type GoogleCalendarEvent } from '@/lib/google-calendar'
import { calculateTripCost } from '@/lib/pricing'
import { processRetroactiveRefunds, sendRefundNotifications } from '@/lib/retroactive-refunds'
import { blockTimeSlot, checkTimeSlotAvailability as simpleCheckAvailability } from '@/lib/simple-calendar-blocker'

export interface BookingAvailabilityCheck {
  available: boolean
  reason?: string
  conflictingEvents?: string[]
}

export async function checkBookingAvailability(
  tripStartTime: Date,
  tripEndTime: Date
): Promise<BookingAvailabilityCheck> {
  try {
    // Check if calendar availability checking is enabled
    const availabilityEnabledSetting = await prisma.settings.findUnique({
      where: { key: 'calendar_availability_enabled' }
    })
    
    const availabilityEnabled = availabilityEnabledSetting?.value !== 'false'
    
    if (!availabilityEnabled) {
      return {
        available: true,
        reason: 'Calendar availability checking is disabled'
      }
    }

    // Check availability against Google Calendar or simple blocking system
    let available: boolean
    try {
      // Try Google Calendar first
      available = await checkTimeSlotAvailability(tripStartTime, tripEndTime)
    } catch (error) {
      console.log('[AVAILABILITY] Google Calendar check failed, using simple blocking system')
      // Fallback to simple calendar blocking system
      available = await simpleCheckAvailability(tripStartTime, tripEndTime)
    }
    
    return {
      available,
      reason: available ? undefined : 'Time slot conflicts with existing calendar events'
    }
  } catch (error) {
    console.error('Error checking booking availability:', error)
    return {
      available: true, // Default to available if we can't check
      reason: 'Unable to check calendar availability'
    }
  }
}

export async function createBookingWithCalendarSync(
  bookingData: {
    userId: string
    tripId: string
    pickupLocationId?: string | null
    pickupSavedAddressId?: string | null
    dropoffLocationId?: string
    passengerCount: number
    creditsCost: number
    riderId?: string
    guestName?: string
    guestPhone?: string
  }
): Promise<{ success: boolean; bookingId?: string; error?: string; warning?: string }> {
  try {
    // Get trip details with current bookings
    const trip = await prisma.trip.findUnique({
      where: { id: bookingData.tripId },
      include: { 
        destination: true,
        bookings: {
          where: { status: 'CONFIRMED' }
        }
      }
    })

    if (!trip) {
      return { success: false, error: 'Trip not found' }
    }

    // Calculate current passenger count and new total
    const currentPassengerCount = trip.bookings.reduce(
      (sum, booking) => sum + booking.passengerCount, 
      0
    )
    const newTotalPassengers = currentPassengerCount + bookingData.passengerCount

    console.log(`[BOOKING] Current passengers: ${currentPassengerCount}, New total: ${newTotalPassengers}`)

    // Calculate dynamic pricing based on new passenger count
    const pricingInfo = await calculateTripCost(trip.destinationId, newTotalPassengers)
    
    if (!pricingInfo) {
      console.log('[BOOKING] No dynamic pricing found, using provided cost')
    } else {
      console.log(`[BOOKING] Dynamic pricing: R${pricingInfo.costPerPerson} per person (was R${bookingData.creditsCost})`)
      // Update the booking cost with dynamic pricing
      bookingData.creditsCost = pricingInfo.costPerPerson
    }

    // Check availability before creating booking
    const availabilityCheck = await checkBookingAvailability(
      trip.startTime,
      trip.endTime
    )

    let warning: string | undefined

    if (!availabilityCheck.available) {
      // Allow booking creation but show warning
      warning = `Warning: ${availabilityCheck.reason}. Booking created but may conflict with existing schedule.`
    }

    // Create the booking
    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          ...bookingData,
          status: 'CONFIRMED'
        }
      })

      // Update user credits
      await tx.creditBalance.update({
        where: { userId: bookingData.userId },
        data: { credits: { decrement: bookingData.creditsCost } }
      })

      // Create transaction record
      await tx.creditTransaction.create({
        data: {
          userId: bookingData.userId,
          type: 'USAGE',
          amount: -bookingData.creditsCost,
          description: `Booking for ${trip.destination.name}`
        }
      })

      // Update trip passenger count
      await tx.trip.update({
        where: { id: bookingData.tripId },
        data: { currentPassengers: { increment: bookingData.passengerCount } }
      })

      return newBooking
    })

    // Process retroactive refunds if there are existing bookings and dynamic pricing
    let refundWarning: string | undefined
    if (currentPassengerCount > 0 && pricingInfo) {
      try {
        console.log('[REFUNDS] Processing retroactive refunds...')
        const refundResult = await processRetroactiveRefunds(bookingData.tripId, booking.id)
        
        if (refundResult.success && refundResult.refundsProcessed > 0) {
          console.log(`[REFUNDS] ✅ Processed ${refundResult.refundsProcessed} refunds totaling R${refundResult.totalRefunded}`)
          
          // Send notifications about refunds
          await sendRefundNotifications(refundResult.refundDetails)
          
          refundWarning = `${refundResult.refundsProcessed} existing passenger(s) received R${refundResult.totalRefunded} in total refunds due to price reduction.`
        } else if (refundResult.errors.length > 0) {
          console.error('[REFUNDS] Refund processing had errors:', refundResult.errors)
          refundWarning = 'Some refunds could not be processed automatically.'
        }
      } catch (refundError) {
        console.error('[REFUNDS] Error processing retroactive refunds:', refundError)
        refundWarning = 'Automatic refunds could not be processed.'
      }
    }

    // Attempt trip-level calendar sync (don't fail booking if this fails)
    try {
      console.log('[CALENDAR SYNC] Starting calendar sync for trip:', bookingData.tripId)
      
      const syncEnabled = await prisma.settings.findUnique({
        where: { key: 'calendar_sync_enabled' }
      })
      
      console.log('[CALENDAR SYNC] Sync enabled setting:', syncEnabled?.value)
      
      if (syncEnabled?.value !== 'false') {
        console.log('[CALENDAR SYNC] Attempting calendar sync...')
        
        // Inline calendar sync logic to avoid import issues
        const trip = await prisma.trip.findUnique({
          where: { id: bookingData.tripId },
          include: {
            destination: true,
            bookings: {
              where: { status: 'CONFIRMED' },
              include: {
                pickupLocation: true,
                pickupSavedAddress: true,
                dropoffLocation: true,
                rider: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        })

        if (!trip || trip.bookings.length === 0) {
          console.log('[CALENDAR SYNC] ❌ Trip not found or no confirmed bookings')
        } else {
          // Check if trip already has a calendar event ID
          const existingEventSetting = await prisma.settings.findUnique({
            where: { key: `calendar_event_${bookingData.tripId}` }
          })

          const googleCredentials = await getGoogleCalendarCredentials()
          
          if (googleCredentials) {
            try {
              const googleCalendarService = new GoogleCalendarService()
              await googleCalendarService.authenticate(googleCredentials)
              
              // Create consolidated passenger list
              const passengers = trip.bookings.map(booking => ({
                name: booking.guestName || booking.rider?.name || booking.user.name || 'Customer',
                phone: booking.guestPhone || booking.rider?.phone,
                email: booking.user.email,
                pickupLocation: booking.pickupLocation?.address || booking.pickupSavedAddress?.address || 'Unknown',
                isGuest: !!booking.guestName
              }))

              const googleEvent: GoogleCalendarEvent = {
                bookingId: trip.id,
                tripStartTime: trip.startTime,
                tripEndTime: trip.endTime,
                pickupLocation: passengers.map(p => p.pickupLocation).join(', '),
                dropoffLocation: trip.destination.address,
                passengerCount: trip.bookings.reduce((sum, booking) => sum + booking.passengerCount, 0),
                destination: trip.destination.name,
                userEmail: passengers[0].email,
                userName: passengers.map(p => p.name).join(', '),
                userPhone: passengers.find(p => p.phone)?.phone,
                allPassengers: passengers
              }
              
              let eventId: string
              
              if (existingEventSetting?.value) {
                // Update existing event
                try {
                  await googleCalendarService.updateEvent(
                    existingEventSetting.value, 
                    googleEvent, 
                    googleCredentials.calendarId
                  )
                  eventId = existingEventSetting.value
                  console.log('[CALENDAR SYNC] ✅ Updated existing calendar event:', eventId)
                } catch (updateError) {
                  console.log('[CALENDAR SYNC] Failed to update, creating new event:', updateError)
                  eventId = await googleCalendarService.createEvent(googleEvent, googleCredentials.calendarId)
                  console.log('[CALENDAR SYNC] ✅ Created new calendar event:', eventId)
                }
              } else {
                // Create new event
                eventId = await googleCalendarService.createEvent(googleEvent, googleCredentials.calendarId)
                console.log('[CALENDAR SYNC] ✅ Created new calendar event:', eventId)
              }
              
              // Store the event ID at trip level
              await prisma.settings.upsert({
                where: { key: `calendar_event_${bookingData.tripId}` },
                update: { 
                  value: eventId,
                  description: `Google Calendar event ID for trip to ${trip.destination.name}`
                },
                create: { 
                  key: `calendar_event_${bookingData.tripId}`,
                  value: eventId,
                  description: `Google Calendar event ID for trip to ${trip.destination.name}`
                }
              })
              
              console.log('[CALENDAR SYNC] ✅ Calendar sync completed successfully')
              
            } catch (googleError) {
              console.error('[CALENDAR SYNC] ❌ Google Calendar sync failed:', googleError)
            }
          } else {
            console.log('[CALENDAR SYNC] ❌ Google Calendar credentials not available')
            
            // Fallback: Use simple calendar blocking system
            console.log('[CALENDAR SYNC] Using simple calendar blocking as fallback...')
            const blockSuccess = await blockTimeSlot({
              startTime: trip.startTime,
              endTime: trip.endTime,
              reason: `Shuttle trip to ${trip.destination.name}`,
              tripId: bookingData.tripId
            })
            
            if (blockSuccess) {
              console.log('[CALENDAR SYNC] ✅ Simple calendar block created successfully')
            } else {
              console.log('[CALENDAR SYNC] ❌ Failed to create simple calendar block')
            }
          }
        }
      } else {
        console.log('[CALENDAR SYNC] Calendar sync is disabled')
      }
    } catch (syncError) {
      console.error('[CALENDAR SYNC] Calendar sync failed for trip:', bookingData.tripId, syncError)
      console.error('[CALENDAR SYNC] Error stack:', syncError.stack)
      warning = warning 
        ? `${warning} Additionally, calendar sync failed.`
        : 'Booking created successfully but calendar sync failed.'
    }

    // Combine warnings
    const combinedWarning = [warning, refundWarning].filter(Boolean).join(' ')

    return { 
      success: true, 
      bookingId: booking.id,
      warning: combinedWarning || undefined
    }

  } catch (error) {
    console.error('Error creating booking with calendar sync:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create booking' 
    }
  }
}

export async function updateBookingWithCalendarSync(
  bookingId: string,
  updateData: Partial<{
    tripId: string
    pickupLocationId: string
    dropoffLocationId: string
    passengerCount: number
    status: string
  }>
): Promise<{ success: boolean; error?: string; warning?: string }> {
  try {
    // Get current booking
    const currentBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        trip: { include: { destination: true } }
      }
    })

    if (!currentBooking) {
      return { success: false, error: 'Booking not found' }
    }

    let warning: string | undefined

    // If changing trip, check availability for new trip
    if (updateData.tripId && updateData.tripId !== currentBooking.tripId) {
      const newTrip = await prisma.trip.findUnique({
        where: { id: updateData.tripId }
      })

      if (newTrip) {
        const availabilityCheck = await checkBookingAvailability(
          newTrip.startTime,
          newTrip.endTime
        )

        if (!availabilityCheck.available) {
          warning = `Warning: ${availabilityCheck.reason}. Update processed but may conflict with existing schedule.`
        }
      }
    }

    // Update the booking
    await prisma.booking.update({
      where: { id: bookingId },
      data: updateData
    })

    // Attempt calendar sync update
    try {
      const syncEnabled = await prisma.settings.findUnique({
        where: { key: 'calendar_sync_enabled' }
      })
      
      if (syncEnabled?.value !== 'false') {
        // Use inlined trip-level calendar sync for proper event updates
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          select: { tripId: true }
        })
        
        if (booking?.tripId) {
          // Inline the same calendar sync logic used in createBookingWithCalendarSync
          const trip = await prisma.trip.findUnique({
            where: { id: booking.tripId },
            include: {
              destination: true,
              bookings: {
                where: { status: 'CONFIRMED' },
                include: {
                  pickupLocation: true,
                  pickupSavedAddress: true,
                  dropoffLocation: true,
                  rider: true,
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true
                    }
                  }
                }
              }
            }
          })

          if (trip && trip.bookings.length > 0) {
            const existingEventSetting = await prisma.settings.findUnique({
              where: { key: `calendar_event_${booking.tripId}` }
            })

            const googleCredentials = await getGoogleCalendarCredentials()
            
            if (googleCredentials) {
              const googleCalendarService = new GoogleCalendarService()
              await googleCalendarService.authenticate(googleCredentials)
              
              const passengers = trip.bookings.map(booking => ({
                name: booking.guestName || booking.rider?.name || booking.user.name || 'Customer',
                phone: booking.guestPhone || booking.rider?.phone,
                email: booking.user.email,
                pickupLocation: booking.pickupLocation?.address || booking.pickupSavedAddress?.address || 'Unknown',
                isGuest: !!booking.guestName
              }))

              const googleEvent: GoogleCalendarEvent = {
                bookingId: trip.id,
                tripStartTime: trip.startTime,
                tripEndTime: trip.endTime,
                pickupLocation: passengers.map(p => p.pickupLocation).join(', '),
                dropoffLocation: trip.destination.address,
                passengerCount: trip.bookings.reduce((sum, booking) => sum + booking.passengerCount, 0),
                destination: trip.destination.name,
                userEmail: passengers[0].email,
                userName: passengers.map(p => p.name).join(', '),
                userPhone: passengers.find(p => p.phone)?.phone,
                allPassengers: passengers
              }
              
              let eventId: string
              
              if (existingEventSetting?.value) {
                try {
                  await googleCalendarService.updateEvent(
                    existingEventSetting.value, 
                    googleEvent, 
                    googleCredentials.calendarId
                  )
                  eventId = existingEventSetting.value
                } catch (updateError) {
                  eventId = await googleCalendarService.createEvent(googleEvent, googleCredentials.calendarId)
                }
              } else {
                eventId = await googleCalendarService.createEvent(googleEvent, googleCredentials.calendarId)
              }
              
              await prisma.settings.upsert({
                where: { key: `calendar_event_${booking.tripId}` },
                update: { 
                  value: eventId,
                  description: `Google Calendar event ID for trip to ${trip.destination.name}`
                },
                create: { 
                  key: `calendar_event_${booking.tripId}`,
                  value: eventId,
                  description: `Google Calendar event ID for trip to ${trip.destination.name}`
                }
              })
            }
          }
        }
      }
    } catch (syncError) {
      console.error('Calendar sync update failed for booking:', bookingId, syncError)
      warning = warning 
        ? `${warning} Additionally, calendar sync update failed.`
        : 'Booking updated successfully but calendar sync failed.'
    }

    return { 
      success: true,
      warning
    }

  } catch (error) {
    console.error('Error updating booking with calendar sync:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update booking' 
    }
  }
}

export async function deleteBookingWithCalendarSync(
  bookingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get booking details before deletion
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId }
    })

    if (!booking) {
      return { success: false, error: 'Booking not found' }
    }

    // Extract Google Calendar event ID from notes if it exists
    const googleEventId = booking.notes?.match(/Google Calendar Event ID: (.+)/)?.[1]

    // Delete the booking
    await prisma.$transaction(async (tx) => {
      await tx.booking.delete({
        where: { id: bookingId }
      })

      // Refund credits if applicable
      const refundEnabledSetting = await tx.settings.findUnique({
        where: { key: 'refund_enabled' }
      })
      
      if (refundEnabledSetting?.value !== 'false') {
        await tx.creditBalance.update({
          where: { userId: booking.userId },
          data: { credits: { increment: booking.creditsCost } }
        })

        await tx.creditTransaction.create({
          data: {
            userId: booking.userId,
            type: 'REFUND',
            amount: booking.creditsCost,
            description: `Refund for cancelled booking ${bookingId}`
          }
        })
      }

      // Update trip passenger count
      await tx.trip.update({
        where: { id: booking.tripId },
        data: { currentPassengers: { decrement: booking.passengerCount } }
      })
    })

    // Attempt to delete from Google Calendar
    if (googleEventId) {
      try {
        const { GoogleCalendarService, getGoogleCalendarCredentials } = await import('@/lib/google-calendar')
        const credentials = await getGoogleCalendarCredentials()
        
        if (credentials) {
          const calendarService = new GoogleCalendarService()
          await calendarService.authenticate(credentials)
          await calendarService.deleteEvent(googleEventId, credentials.calendarId)
          console.log(`Deleted Google Calendar event ${googleEventId} for booking ${bookingId}`)
        }
      } catch (deleteError) {
        console.error('Failed to delete Google Calendar event:', deleteError)
        // Don't fail the booking deletion if calendar delete fails
      }
    }

    return { success: true }

  } catch (error) {
    console.error('Error deleting booking with calendar sync:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to delete booking' 
    }
  }
}