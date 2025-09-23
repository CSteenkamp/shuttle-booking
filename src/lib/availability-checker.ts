import { GoogleCalendarService, getGoogleCalendarCredentials } from '@/lib/google-calendar'
import { prisma } from '@/lib/prisma'

export interface AvailabilitySlot {
  startTime: Date
  endTime: Date
  available: boolean
  reason?: string
}

export interface AvailabilityCheck {
  date: Date
  slots: AvailabilitySlot[]
  totalSlots: number
  availableSlots: number
}

export class AvailabilityChecker {
  private googleCalendarService: GoogleCalendarService | null = null
  private calendarId: string | null = null

  async initialize(): Promise<boolean> {
    try {
      const credentials = await getGoogleCalendarCredentials()
      
      if (!credentials) {
        console.log('Google Calendar not configured, availability checking disabled')
        return false
      }

      this.googleCalendarService = new GoogleCalendarService()
      await this.googleCalendarService.authenticate(credentials)
      this.calendarId = credentials.calendarId
      
      return true
    } catch (error) {
      console.error('Failed to initialize availability checker:', error)
      return false
    }
  }

  async checkTimeSlotAvailability(
    startTime: Date,
    endTime: Date
  ): Promise<AvailabilitySlot> {
    // Always available if Google Calendar is not configured
    if (!this.googleCalendarService || !this.calendarId) {
      return {
        startTime,
        endTime,
        available: true,
        reason: 'Calendar integration not configured'
      }
    }

    try {
      const isAvailable = await this.googleCalendarService.checkAvailability(
        startTime,
        endTime,
        this.calendarId
      )

      return {
        startTime,
        endTime,
        available: isAvailable,
        reason: isAvailable ? undefined : 'Calendar conflict detected'
      }
    } catch (error) {
      console.error('Error checking time slot availability:', error)
      return {
        startTime,
        endTime,
        available: true, // Default to available if we can't check
        reason: 'Unable to check calendar availability'
      }
    }
  }

  async checkDayAvailability(
    date: Date,
    intervalMinutes: number = 20
  ): Promise<AvailabilityCheck> {
    // Get business hours from settings
    const businessStartSetting = await prisma.settings.findUnique({
      where: { key: 'business_start_hour' }
    })
    const businessEndSetting = await prisma.settings.findUnique({
      where: { key: 'business_end_hour' }
    })

    const businessStartHour = parseInt(businessStartSetting?.value || '6')
    const businessEndHour = parseInt(businessEndSetting?.value || '22')

    // Generate time slots for the day
    const slots: AvailabilitySlot[] = []
    const dayStart = new Date(date)
    dayStart.setHours(businessStartHour, 0, 0, 0)
    
    const dayEnd = new Date(date)
    dayEnd.setHours(businessEndHour, 0, 0, 0)

    let currentTime = new Date(dayStart)
    
    while (currentTime < dayEnd) {
      const slotEnd = new Date(currentTime.getTime() + intervalMinutes * 60000)
      
      if (slotEnd <= dayEnd) {
        const availability = await this.checkTimeSlotAvailability(
          new Date(currentTime),
          slotEnd
        )
        slots.push(availability)
      }
      
      currentTime = slotEnd
    }

    const availableSlots = slots.filter(slot => slot.available).length

    return {
      date,
      slots,
      totalSlots: slots.length,
      availableSlots
    }
  }

  async checkMultipleDaysAvailability(
    startDate: Date,
    endDate: Date,
    intervalMinutes: number = 20
  ): Promise<AvailabilityCheck[]> {
    const results: AvailabilityCheck[] = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      // Skip weekends if weekend service is disabled
      const weekendServiceSetting = await prisma.settings.findUnique({
        where: { key: 'weekend_service_enabled' }
      })
      
      const weekendServiceEnabled = weekendServiceSetting?.value !== 'false'
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6
      
      if (!isWeekend || weekendServiceEnabled) {
        const dayAvailability = await this.checkDayAvailability(
          new Date(currentDate),
          intervalMinutes
        )
        results.push(dayAvailability)
      }

      currentDate.setDate(currentDate.getDate() + 1)
    }

    return results
  }

  async isTimeSlotAvailable(startTime: Date, endTime: Date): Promise<boolean> {
    const availability = await this.checkTimeSlotAvailability(startTime, endTime)
    return availability.available
  }

  async getUnavailableSlots(
    date: Date,
    intervalMinutes: number = 20
  ): Promise<AvailabilitySlot[]> {
    const dayAvailability = await this.checkDayAvailability(date, intervalMinutes)
    return dayAvailability.slots.filter(slot => !slot.available)
  }

  async getAvailableSlots(
    date: Date,
    intervalMinutes: number = 20
  ): Promise<AvailabilitySlot[]> {
    const dayAvailability = await this.checkDayAvailability(date, intervalMinutes)
    return dayAvailability.slots.filter(slot => slot.available)
  }
}

// Global instance for reuse
let availabilityChecker: AvailabilityChecker | null = null

export async function getAvailabilityChecker(): Promise<AvailabilityChecker> {
  if (!availabilityChecker) {
    availabilityChecker = new AvailabilityChecker()
    await availabilityChecker.initialize()
  }
  return availabilityChecker
}

// Helper functions
export async function checkTimeSlotAvailability(
  startTime: Date,
  endTime: Date
): Promise<boolean> {
  const checker = await getAvailabilityChecker()
  return checker.isTimeSlotAvailable(startTime, endTime)
}

export async function getDayAvailability(
  date: Date,
  intervalMinutes: number = 20
): Promise<AvailabilityCheck> {
  const checker = await getAvailabilityChecker()
  return checker.checkDayAvailability(date, intervalMinutes)
}