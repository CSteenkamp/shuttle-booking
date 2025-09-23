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
  intervalMinutes: number = 20,
  customDuration?: number // Duration in minutes for specific destinations
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
  
  // Use custom duration if provided, otherwise use interval
  const slotDuration = customDuration || intervalMinutes
  
  while (isBefore(currentTime, endTime)) {
    const slotEnd = addMinutes(currentTime, slotDuration)
    
    // Make sure the slot end doesn't exceed the end hour
    if (isAfter(slotEnd, endTime)) {
      break
    }
    
    slots.push({
      startTime: new Date(currentTime),
      endTime: new Date(slotEnd),
      label: `${format(currentTime, 'HH:mm')} - ${format(slotEnd, 'HH:mm')}${customDuration ? ` (${customDuration}min)` : ''}`,
    })
    
    // For custom durations, move to next available slot based on interval
    // For regular slots, use the slot duration as interval
    currentTime = customDuration ? addMinutes(currentTime, intervalMinutes) : slotEnd
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
  cutoffMinutes: number = 30,
  customDuration?: number
): TimeSlot | null {
  const slots = generateTimeSlots(date, startHour, endHour, intervalMinutes, customDuration)
  
  for (const slot of slots) {
    if (isSlotAvailable(slot.startTime, cutoffMinutes)) {
      return slot
    }
  }
  
  return null
}