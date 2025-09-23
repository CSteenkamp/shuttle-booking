// Using date-fns for calendar generation

export interface CalendarEvent {
  title: string
  description: string
  startTime: Date
  endTime: Date
  location: string
  attendees?: string[]
  url?: string
}

export interface BookingDetails {
  id: string
  trip: {
    destination: {
      name: string
      address: string
    }
    startTime: string
    endTime: string
  }
  pickupLocation: {
    address: string
  }
  rider?: {
    name: string
    phone?: string
  }
  user: {
    name: string
    email: string
  }
}

// Generate calendar event data from booking
export function generateCalendarEvent(booking: BookingDetails): CalendarEvent {
  const startTime = new Date(booking.trip.startTime)
  const endTime = new Date(booking.trip.endTime)
  
  const riderInfo = booking.rider 
    ? ` for ${booking.rider.name}`
    : ''
  
  const phoneInfo = booking.rider?.phone 
    ? ` (${booking.rider.phone})`
    : ''

  return {
    title: `DRIVE: ${booking.trip.destination.name}${riderInfo}`,
    description: `ShuttlePro Driver Schedule:
    
🚐 Destination: ${booking.trip.destination.name}
📍 Pickup: ${booking.pickupLocation.address}
📍 Dropoff: ${booking.trip.destination.address}
👤 Passenger: ${booking.rider?.name || booking.user.name}${phoneInfo}
📧 Contact: ${booking.user.email}
🎫 Booking ID: ${booking.id}`,
    startTime,
    endTime,
    location: booking.pickupLocation.address,
    attendees: [],
    url: `${process.env.NEXTAUTH_URL}/admin/bookings`
  }
}

// Generate ICS file content
export function generateICSFile(event: CalendarEvent): string {
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const escapeText = (text: string) => {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n')
  }

  const now = new Date()
  const uid = `shuttle-${Date.now()}@shuttlepro.com`

  return `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//ShuttlePro//Shuttle Booking//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatDate(now)}
DTSTART:${formatDate(event.startTime)}
DTEND:${formatDate(event.endTime)}
SUMMARY:${escapeText(event.title)}
DESCRIPTION:${escapeText(event.description)}
LOCATION:${escapeText(event.location)}
URL:${event.url || ''}
STATUS:CONFIRMED
TRANSP:OPAQUE
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Shuttle departure in 20 minutes
TRIGGER:-PT20M
END:VALARM
END:VEVENT
END:VCALENDAR`
}

// Generate Google Calendar URL
export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  const formatGoogleDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGoogleDate(event.startTime)}/${formatGoogleDate(event.endTime)}`,
    details: event.description,
    location: event.location,
    trp: 'false' // Don't show in search results
  })

  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// Generate Outlook Calendar URL
export function generateOutlookUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    subject: event.title,
    startdt: event.startTime.toISOString(),
    enddt: event.endTime.toISOString(),
    body: event.description,
    location: event.location,
    allday: 'false'
  })

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

// Generate Apple Calendar URL (webcal)
export function generateAppleCalendarUrl(icsContent: string): string {
  // In a real implementation, you'd upload the ICS to a server and return a webcal:// URL
  // For now, we'll return a data URL that can be downloaded
  const blob = new Blob([icsContent], { type: 'text/calendar' })
  return URL.createObjectURL(blob)
}

// Auto-detect calendar preference and generate appropriate URL
export function getCalendarUrl(event: CalendarEvent, provider: 'google' | 'outlook' | 'apple' | 'ics' = 'google'): string {
  switch (provider) {
    case 'google':
      return generateGoogleCalendarUrl(event)
    case 'outlook':
      return generateOutlookUrl(event)
    case 'apple':
    case 'ics':
      const icsContent = generateICSFile(event)
      return generateAppleCalendarUrl(icsContent)
    default:
      return generateGoogleCalendarUrl(event)
  }
}

// Detect user's preferred calendar based on user agent
export function detectCalendarProvider(): 'google' | 'outlook' | 'apple' | 'ics' {
  if (typeof window === 'undefined') return 'google'
  
  const userAgent = window.navigator.userAgent.toLowerCase()
  
  if (userAgent.includes('mac') || userAgent.includes('iphone') || userAgent.includes('ipad')) {
    return 'apple'
  } else if (userAgent.includes('outlook') || userAgent.includes('microsoft')) {
    return 'outlook'
  } else {
    return 'google'
  }
}