import { google } from 'googleapis'
import { JWT } from 'google-auth-library'

export interface GoogleCalendarCredentials {
  serviceAccountKey: string
  calendarId: string
  impersonateEmail?: string
}

export interface GoogleCalendarEvent {
  bookingId: string
  tripStartTime: Date
  tripEndTime: Date
  pickupLocation: string
  dropoffLocation: string
  passengerCount: number
  destination: string
  userEmail: string
  userName: string
  userPhone?: string
  allPassengers?: Array<{
    name: string
    phone?: string
    email: string
    pickupLocation: string
  }>
}

export class GoogleCalendarService {
  private auth: JWT | null = null
  private calendar: ReturnType<typeof google.calendar> | null = null

  async authenticate(credentials: GoogleCalendarCredentials): Promise<void> {
    try {
      const serviceAccount = JSON.parse(credentials.serviceAccountKey)
      
      this.auth = new JWT({
        email: serviceAccount.client_email,
        key: serviceAccount.private_key,
        scopes: [
          'https://www.googleapis.com/auth/calendar',
          'https://www.googleapis.com/auth/calendar.events'
        ]
        // Note: subject/impersonation removed - using service account directly
      })

      this.calendar = google.calendar({ version: 'v3', auth: this.auth })
    } catch (error) {
      console.error('Failed to authenticate with Google Calendar:', error)
      throw new Error('Unable to authenticate with Google Calendar. Please check your service account credentials.')
    }
  }

  async createEvent(
    eventData: GoogleCalendarEvent,
    calendarId: string = 'primary'
  ): Promise<string> {
    if (!this.calendar) {
      throw new Error('Google Calendar service not authenticated')
    }

    try {
      const passengerNames = eventData.allPassengers && eventData.allPassengers.length > 0
        ? eventData.allPassengers.map(p => p.name).join(', ')
        : eventData.userName

      const event = {
        summary: `DRIVE: ${eventData.destination} - ${passengerNames}${eventData.passengerCount > 1 ? ` (${eventData.passengerCount})` : ''}`,
        description: this.generateEventDescription(eventData),
        location: eventData.pickupLocation,
        start: {
          dateTime: eventData.tripStartTime.toISOString(),
          timeZone: 'Africa/Johannesburg'
        },
        end: {
          dateTime: eventData.tripEndTime.toISOString(),
          timeZone: 'Africa/Johannesburg'
        },
        // Note: Service accounts cannot invite attendees without Domain-Wide Delegation
        // Passenger contact info is included in the description instead
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 20 }
          ]
        },
        extendedProperties: {
          private: {
            bookingId: eventData.bookingId,
            source: 'tjoeftjaf'
          }
        }
      }

      const response = await this.calendar.events.insert({
        calendarId,
        requestBody: event
      })

      return response.data.id
    } catch (error) {
      console.error('Failed to create Google Calendar event:', error)
      throw new Error('Unable to create calendar event. Please try again.')
    }
  }

  async updateEvent(
    eventId: string,
    eventData: GoogleCalendarEvent,
    calendarId: string = 'primary'
  ): Promise<void> {
    if (!this.calendar) {
      throw new Error('Google Calendar service not authenticated')
    }

    try {
      const passengerNames = eventData.allPassengers && eventData.allPassengers.length > 0
        ? eventData.allPassengers.map(p => p.name).join(', ')
        : eventData.userName

      const event = {
        summary: `DRIVE: ${eventData.destination} - ${passengerNames}${eventData.passengerCount > 1 ? ` (${eventData.passengerCount})` : ''}`,
        description: this.generateEventDescription(eventData),
        location: eventData.pickupLocation,
        start: {
          dateTime: eventData.tripStartTime.toISOString(),
          timeZone: 'Africa/Johannesburg'
        },
        end: {
          dateTime: eventData.tripEndTime.toISOString(),
          timeZone: 'Africa/Johannesburg'
        }
      }

      await this.calendar.events.update({
        calendarId,
        eventId,
        requestBody: event
      })
    } catch (error) {
      console.error('Failed to update Google Calendar event:', error)
      throw new Error('Unable to update calendar event.')
    }
  }

  async deleteEvent(eventId: string, calendarId: string = 'primary'): Promise<void> {
    if (!this.calendar) {
      throw new Error('Google Calendar service not authenticated')
    }

    try {
      await this.calendar.events.delete({
        calendarId,
        eventId
      })
    } catch (error) {
      console.error('Failed to delete Google Calendar event:', error)
      throw new Error('Unable to delete calendar event.')
    }
  }

  async getEvents(
    startTime: Date,
    endTime: Date,
    calendarId: string = 'primary'
  ): Promise<unknown[]> {
    if (!this.calendar) {
      throw new Error('Google Calendar service not authenticated')
    }

    try {
      const response = await this.calendar.events.list({
        calendarId,
        timeMin: startTime.toISOString(),
        timeMax: endTime.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      })

      return response.data.items || []
    } catch (error) {
      console.error('Failed to get Google Calendar events:', error)
      throw new Error('Unable to fetch calendar events.')
    }
  }

  async checkAvailability(
    startTime: Date,
    endTime: Date,
    calendarId: string = 'primary'
  ): Promise<boolean> {
    try {
      const events = await this.getEvents(startTime, endTime, calendarId)
      
      // Check if there are any events that overlap with the requested time
      const hasConflict = events.some((event: unknown) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const anyEvent = event as any
        const eventStart = new Date(anyEvent.start?.dateTime || anyEvent.start?.date)
        const eventEnd = new Date(anyEvent.end?.dateTime || anyEvent.end?.date)
        
        // Check for overlap
        return (startTime < eventEnd && endTime > eventStart)
      })

      return !hasConflict
    } catch (error) {
      console.error('Failed to check calendar availability:', error)
      return false // Assume not available if we can't check
    }
  }

  private generateEventDescription(eventData: GoogleCalendarEvent): string {
    const lines = [
      `Tjoef-Tjaf Driver Schedule:`,
      ``,
      `🚐 Destination: ${eventData.destination}`,
      `📍 Pickup: ${eventData.pickupLocation}`,
      `📍 Dropoff: ${eventData.dropoffLocation}`,
    ]

    // Handle multiple passengers if available
    if (eventData.allPassengers && eventData.allPassengers.length > 0) {
      lines.push(`👥 Passengers (${eventData.passengerCount}):`)
      eventData.allPassengers.forEach((passenger, index) => {
        const phoneInfo = passenger.phone ? ` (${passenger.phone})` : ''
        const pickupInfo = passenger.pickupLocation !== eventData.pickupLocation 
          ? ` - Pickup: ${passenger.pickupLocation}` 
          : ''
        lines.push(`   ${index + 1}. ${passenger.name}${phoneInfo}${pickupInfo}`)
        lines.push(`      📧 ${passenger.email}`)
      })
    } else {
      // Fallback to single passenger format
      lines.push(`👤 Passenger: ${eventData.userName}${eventData.userPhone ? ` (${eventData.userPhone})` : ''}`)
      lines.push(`📧 Contact: ${eventData.userEmail}`)
    }

    lines.push(`🎫 Trip ID: ${eventData.bookingId}`)

    return lines.join('\n')
  }
}

// Helper function to check if Google Calendar is configured
export async function isGoogleCalendarConfigured(): Promise<boolean> {
  try {
    const { prisma } = await import('@/lib/prisma')
    
    const serviceAccountKey = await prisma.settings.findUnique({
      where: { key: 'google_calendar_service_account' }
    })
    
    const calendarId = await prisma.settings.findUnique({
      where: { key: 'google_calendar_id' }
    })
    
    return !!(serviceAccountKey?.value && calendarId?.value)
  } catch (error) {
    console.error('Error checking Google Calendar configuration:', error)
    return false
  }
}

// Helper function to get Google Calendar credentials from settings
export async function getGoogleCalendarCredentials(): Promise<GoogleCalendarCredentials | null> {
  try {
    const { prisma } = await import('@/lib/prisma')
    
    const serviceAccountKey = await prisma.settings.findUnique({
      where: { key: 'google_calendar_service_account' }
    })
    
    const calendarId = await prisma.settings.findUnique({
      where: { key: 'google_calendar_id' }
    })
    
    const impersonateEmail = await prisma.settings.findUnique({
      where: { key: 'google_calendar_impersonate_email' }
    })
    
    if (!serviceAccountKey?.value || !calendarId?.value) {
      return null
    }
    
    return {
      serviceAccountKey: serviceAccountKey.value,
      calendarId: calendarId.value,
      impersonateEmail: impersonateEmail?.value
    }
  } catch (error) {
    console.error('Error getting Google Calendar credentials:', error)
    return null
  }
}