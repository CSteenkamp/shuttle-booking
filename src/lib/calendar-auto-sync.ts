import { prisma } from '@/lib/prisma'
import { generateCalendarEvent, generateICSFile, type BookingDetails } from '@/lib/calendar'
import { sendCalendarInvite } from '@/lib/email'
import { GoogleCalendarService, getGoogleCalendarCredentials, type GoogleCalendarEvent } from '@/lib/google-calendar'

export async function autoSyncBookingToCalendar(bookingId: string) {
  try {
    // Fetch booking with all related data
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
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
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!booking) {
      throw new Error('Booking not found')
    }

    // Get user's calendar preference (unused for now but may be used later)
    // const preference = await prisma.settings.findUnique({
    //   where: { key: `calendar_preference_${booking.user.id}` }
    // })

    // Try Google Calendar first, then fallback to email invite
    const googleCredentials = await getGoogleCalendarCredentials()
    
    if (googleCredentials) {
      try {
        const googleCalendarService = new GoogleCalendarService()
        await googleCalendarService.authenticate(googleCredentials)
        
        const googleEvent: GoogleCalendarEvent = {
          bookingId: booking.id,
          tripStartTime: booking.trip.startTime,
          tripEndTime: booking.trip.endTime,
          pickupLocation: booking.pickupLocation.address,
          dropoffLocation: booking.dropoffLocation?.address || booking.trip.destination.address,
          passengerCount: booking.passengerCount,
          destination: booking.trip.destination.name,
          userEmail: booking.user.email,
          userName: booking.rider?.name || booking.user.name || 'Customer',
          userPhone: booking.rider?.phone
        }
        
        const eventId = await googleCalendarService.createEvent(googleEvent, googleCredentials.calendarId)
        
        // Store the Google Calendar event ID in the booking
        await prisma.booking.update({
          where: { id: bookingId },
          data: {
            notes: booking.notes 
              ? `${booking.notes}\nGoogle Calendar Event ID: ${eventId}`
              : `Google Calendar Event ID: ${eventId}`
          }
        })
        
        console.log(`Google Calendar event created for booking ${bookingId}: ${eventId}`)
        return { success: true, provider: 'google', eventId }
        
      } catch (googleError) {
        console.error('Google Calendar sync failed, falling back to email invite:', googleError)
      }
    }

    // Fallback to email calendar invite
    const event = generateCalendarEvent(booking as BookingDetails)
    const icsContent = generateICSFile(event)

    // Get driver email and name from settings
    const driverEmailSetting = await prisma.settings.findUnique({
      where: { key: 'driver_email' }
    })
    const driverNameSetting = await prisma.settings.findUnique({
      where: { key: 'driver_name' }
    })
    
    const driverEmail = driverEmailSetting?.value || ''
    const driverName = driverNameSetting?.value || 'Christiaan'
    
    if (driverEmail) {
      await sendCalendarInvite({
        userEmail: driverEmail,
        userName: driverName,
        event,
        icsContent,
        bookingId: booking.id,
        passengerDetails: {
          passengerName: booking.rider?.name || booking.user.name || 'Customer',
          passengerEmail: booking.user.email,
          passengerPhone: booking.rider?.phone
        }
      })
      
      console.log(`Email calendar invite sent for booking ${bookingId} to ${driverEmail}`)
    }

    return { success: true, provider: driverEmail ? 'email' : 'none' }
  } catch (error) {
    console.error('Error auto-syncing booking to calendar:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function syncAllUserBookingsToCalendar(userId: string) {
  try {
    // Fetch all upcoming bookings for the user
    const bookings = await prisma.booking.findMany({
      where: {
        userId,
        status: 'CONFIRMED',
        trip: {
          startTime: {
            gte: new Date() // Only future trips
          }
        }
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
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // Group bookings by trip to avoid duplicate sync calls
    const tripIds = [...new Set(bookings.map(booking => booking.tripId))]
    
    const results = []
    for (const tripId of tripIds) {
      const result = await syncTripToCalendar(tripId)
      const tripBookings = bookings.filter(b => b.tripId === tripId)
      results.push({ 
        tripId, 
        bookingIds: tripBookings.map(b => b.id),
        ...result 
      })
    }

    return {
      success: true,
      synced: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    }
  } catch (error) {
    console.error('Error syncing all user bookings:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export async function enableAutoCalendarSync(userId: string, enabled: boolean = true) {
  try {
    await prisma.settings.upsert({
      where: { key: `auto_calendar_sync_${userId}` },
      update: { 
        value: enabled.toString(),
        description: `Auto calendar sync setting for user`
      },
      create: { 
        key: `auto_calendar_sync_${userId}`,
        value: enabled.toString(),
        description: `Auto calendar sync setting for user`
      }
    })

    return { success: true, enabled }
  } catch (error) {
    console.error('Error updating auto calendar sync setting:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }
  }
}

export async function syncTripToCalendar(tripId: string) {
  try {
    // Fetch trip with all related bookings
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        destination: true,
        bookings: {
          where: { status: 'CONFIRMED' },
          include: {
            pickupLocation: true,
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
      return { success: false, error: 'Trip not found or no confirmed bookings' }
    }

    // Check if trip already has a calendar event ID
    const existingEventSetting = await prisma.settings.findUnique({
      where: { key: `calendar_event_${tripId}` }
    })

    const googleCredentials = await getGoogleCalendarCredentials()
    
    if (googleCredentials) {
      try {
        const googleCalendarService = new GoogleCalendarService()
        await googleCalendarService.authenticate(googleCredentials)
        
        // Create consolidated passenger list
        const passengers = trip.bookings.map(booking => ({
          name: booking.rider?.name || booking.user.name || 'Customer',
          phone: booking.rider?.phone,
          email: booking.user.email,
          pickupLocation: booking.pickupLocation.address
        }))

        const googleEvent: GoogleCalendarEvent = {
          bookingId: trip.id, // Use trip ID instead of booking ID
          tripStartTime: trip.startTime,
          tripEndTime: trip.endTime,
          pickupLocation: passengers.map(p => p.pickupLocation).join(', '),
          dropoffLocation: trip.destination.address,
          passengerCount: trip.bookings.reduce((sum, booking) => sum + booking.passengerCount, 0),
          destination: trip.destination.name,
          userEmail: passengers[0].email,
          userName: passengers.map(p => p.name).join(', '),
          userPhone: passengers.find(p => p.phone)?.phone,
          allPassengers: passengers // Add consolidated passenger info
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
            console.log(`Google Calendar event updated for trip ${tripId}: ${eventId}`)
          } catch (updateError) {
            console.error('Failed to update calendar event, creating new one:', updateError)
            // If update fails, create a new event
            eventId = await googleCalendarService.createEvent(googleEvent, googleCredentials.calendarId)
          }
        } else {
          // Create new event
          eventId = await googleCalendarService.createEvent(googleEvent, googleCredentials.calendarId)
        }
        
        // Store the event ID at trip level
        await prisma.settings.upsert({
          where: { key: `calendar_event_${tripId}` },
          update: { 
            value: eventId,
            description: `Google Calendar event ID for trip to ${trip.destination.name}`
          },
          create: { 
            key: `calendar_event_${tripId}`,
            value: eventId,
            description: `Google Calendar event ID for trip to ${trip.destination.name}`
          }
        })
        
        console.log(`Google Calendar event synced for trip ${tripId}: ${eventId}`)
        return { success: true, provider: 'google', eventId }
        
      } catch (googleError) {
        console.error('Google Calendar sync failed for trip:', tripId, googleError)
        return { success: false, error: googleError instanceof Error ? googleError.message : 'Google Calendar sync failed' }
      }
    }

    return { success: false, error: 'Google Calendar credentials not available' }
  } catch (error) {
    console.error('Error syncing trip to calendar:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export async function isAutoCalendarSyncEnabled(userId: string): Promise<boolean> {
  try {
    const setting = await prisma.settings.findUnique({
      where: { key: `auto_calendar_sync_${userId}` }
    })

    return setting?.value === 'true'
  } catch (error) {
    console.error('Error checking auto calendar sync setting:', error)
    return false
  }
}