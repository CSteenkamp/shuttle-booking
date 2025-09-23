import { addMinutes, format, startOfDay, isAfter, isBefore } from 'date-fns'

export interface TimeSlot {
  startTime: Date
  endTime: Date
  label: string
}

export function generateTimeSlots(
  date: Date,
  startHour: number = 7,
  endHour: number = 18,
  intervalMinutes: number = 20
): TimeSlot[] {
  const slots: TimeSlot[] = []
  const startOfSelectedDay = startOfDay(date)
  
  // Check if it's a weekday (Monday = 1, Friday = 5)
  const dayOfWeek = date.getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    // Return empty array for weekends
    return slots
  }
  
  let currentTime = new Date(startOfSelectedDay)
  currentTime.setHours(startHour, 0, 0, 0)
  
  const endTime = new Date(startOfSelectedDay)
  endTime.setHours(endHour, 0, 0, 0)
  
  while (isBefore(currentTime, endTime)) {
    const slotEnd = addMinutes(currentTime, intervalMinutes)
    
    slots.push({
      startTime: new Date(currentTime),
      endTime: new Date(slotEnd),
      label: `${format(currentTime, 'HH:mm')} - ${format(slotEnd, 'HH:mm')}`,
    })
    
    currentTime = slotEnd
  }
  
  return slots
}

export function isSlotAvailable(
  slotStartTime: Date,
  cutoffMinutes: number = 30
): boolean {
  const now = new Date()
  const cutoffTime = addMinutes(slotStartTime, -cutoffMinutes)
  return isAfter(cutoffTime, now)
}

export function formatTimeSlot(startTime: Date, endTime: Date): string {
  return `${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')}`
}

export function getNextAvailableSlot(
  date: Date,
  startHour: number = 8,
  endHour: number = 18,
  intervalMinutes: number = 20,
  cutoffMinutes: number = 30
): TimeSlot | null {
  const slots = generateTimeSlots(date, startHour, endHour, intervalMinutes)
  
  for (const slot of slots) {
    if (isSlotAvailable(slot.startTime, cutoffMinutes)) {
      return slot
    }
  }
  
  return null
}