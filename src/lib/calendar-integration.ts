/**
 * Calendar Integration Library
 * Handles Google Calendar OAuth and availability sync for drivers
 */

import { google } from 'googleapis'
import { prisma } from '@/lib/prisma'
import { CalendarProvider, CalendarSyncStatus } from '@prisma/client'

const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly'
]

/**
 * Get OAuth2 client for Google Calendar
 */
export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/driver/calendar/callback`

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

/**
 * Generate authorization URL for driver to connect calendar
 */
export function getAuthorizationUrl(driverId: string): string {
  const oauth2Client = getOAuth2Client()

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: driverId, // Pass driver ID to identify user after callback
    prompt: 'consent' // Force consent screen to get refresh token
  })
}

/**
 * Exchange authorization code for tokens and store them
 */
export async function connectCalendar(driverId: string, code: string) {
  try {
    const oauth2Client = getOAuth2Client()

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to obtain tokens from Google')
    }

    // Get calendar info
    oauth2Client.setCredentials(tokens)
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
    const calendarList = await calendar.calendarList.list()

    const primaryCalendar = calendarList.data.items?.find(cal => cal.primary)
    const calendarId = primaryCalendar?.id || 'primary'
    const calendarName = primaryCalendar?.summary || 'Google Calendar'

    // Store calendar connection
    const driverCalendar = await prisma.driverCalendar.upsert({
      where: { driverId },
      create: {
        driverId,
        provider: CalendarProvider.GOOGLE,
        calendarId,
        calendarName,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        isActive: true,
        lastSyncedAt: new Date(),
        syncStatus: CalendarSyncStatus.SUCCESS
      },
      update: {
        calendarId,
        calendarName,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        isActive: true,
        lastSyncedAt: new Date(),
        syncStatus: CalendarSyncStatus.SUCCESS,
        syncError: null
      }
    })

    // Initial sync
    await syncDriverCalendar(driverId)

    return {
      success: true,
      message: `Connected to ${calendarName}`,
      calendar: driverCalendar
    }

  } catch (error) {
    console.error('Error connecting calendar:', error)

    // Update sync status to failed
    await prisma.driverCalendar.updateMany({
      where: { driverId },
      data: {
        syncStatus: CalendarSyncStatus.FAILED,
        syncError: error instanceof Error ? error.message : 'Unknown error',
        lastSyncedAt: new Date()
      }
    })

    throw error
  }
}

/**
 * Refresh expired access token
 */
async function refreshAccessToken(driverCalendar: any) {
  const oauth2Client = getOAuth2Client()

  oauth2Client.setCredentials({
    refresh_token: driverCalendar.refreshToken
  })

  const { credentials } = await oauth2Client.refreshAccessToken()

  if (!credentials.access_token) {
    throw new Error('Failed to refresh access token')
  }

  // Update stored tokens
  await prisma.driverCalendar.update({
    where: { id: driverCalendar.id },
    data: {
      accessToken: credentials.access_token,
      tokenExpiry: credentials.expiry_date ? new Date(credentials.expiry_date) : null
    }
  })

  return credentials.access_token
}

/**
 * Get valid access token (refresh if expired)
 */
async function getValidAccessToken(driverCalendar: any): Promise<string> {
  const now = new Date()
  const expiry = driverCalendar.tokenExpiry

  // If token is expired or will expire in next 5 minutes, refresh it
  if (!expiry || expiry <= new Date(now.getTime() + 5 * 60 * 1000)) {
    return await refreshAccessToken(driverCalendar)
  }

  return driverCalendar.accessToken
}

/**
 * Sync driver's calendar events
 */
export async function syncDriverCalendar(driverId: string) {
  try {
    // Get driver calendar connection
    const driverCalendar = await prisma.driverCalendar.findUnique({
      where: { driverId }
    })

    if (!driverCalendar || !driverCalendar.isActive) {
      throw new Error('No active calendar connection found')
    }

    // Get valid access token
    const accessToken = await getValidAccessToken(driverCalendar)

    // Set up OAuth client
    const oauth2Client = getOAuth2Client()
    oauth2Client.setCredentials({ access_token: accessToken })

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

    // Fetch events from now until 30 days ahead
    const timeMin = new Date()
    const timeMax = new Date()
    timeMax.setDate(timeMax.getDate() + 30)

    const response = await calendar.events.list({
      calendarId: driverCalendar.calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 250
    })

    const events = response.data.items || []

    // Delete old calendar events for this driver
    await prisma.calendarEvent.deleteMany({
      where: {
        driverId,
        startTime: {
          gte: timeMin
        }
      }
    })

    // Store new events
    const calendarEvents = events
      .filter(event => {
        // Only sync events that have start/end times and aren't marked as available
        return event.start?.dateTime && event.end?.dateTime
      })
      .map(event => ({
        driverId,
        calendarId: driverCalendar.id,
        externalEventId: event.id || '',
        title: event.summary || 'Busy',
        startTime: new Date(event.start!.dateTime!),
        endTime: new Date(event.end!.dateTime!),
        isAllDay: false,
        status: (event.status === 'confirmed' ? 'busy' : 'tentative') as 'busy' | 'free' | 'tentative',
        description: event.description || null
      }))

    if (calendarEvents.length > 0) {
      await prisma.calendarEvent.createMany({
        data: calendarEvents,
        skipDuplicates: true
      })
    }

    // Update sync status
    await prisma.driverCalendar.update({
      where: { id: driverCalendar.id },
      data: {
        lastSyncedAt: new Date(),
        syncStatus: CalendarSyncStatus.SUCCESS,
        syncError: null
      }
    })

    console.log(`[CALENDAR SYNC] Successfully synced ${calendarEvents.length} events for driver ${driverId}`)

    return {
      success: true,
      eventsCount: calendarEvents.length,
      syncedAt: new Date()
    }

  } catch (error) {
    console.error('Error syncing calendar:', error)

    // Update sync status
    await prisma.driverCalendar.updateMany({
      where: { driverId },
      data: {
        syncStatus: CalendarSyncStatus.FAILED,
        syncError: error instanceof Error ? error.message : 'Unknown error',
        lastSyncedAt: new Date()
      }
    })

    throw error
  }
}

/**
 * Disconnect calendar for a driver
 */
export async function disconnectCalendar(driverId: string) {
  try {
    // Get calendar connection
    const driverCalendar = await prisma.driverCalendar.findUnique({
      where: { driverId }
    })

    if (!driverCalendar) {
      return { success: false, message: 'No calendar connection found' }
    }

    // Revoke Google token
    try {
      const oauth2Client = getOAuth2Client()
      oauth2Client.setCredentials({
        access_token: driverCalendar.accessToken
      })
      await oauth2Client.revokeCredentials()
    } catch (error) {
      console.warn('Failed to revoke Google token:', error)
      // Continue anyway to clean up local data
    }

    // Delete all calendar events
    await prisma.calendarEvent.deleteMany({
      where: { driverId }
    })

    // Delete calendar connection
    await prisma.driverCalendar.delete({
      where: { id: driverCalendar.id }
    })

    return {
      success: true,
      message: 'Calendar disconnected successfully'
    }

  } catch (error) {
    console.error('Error disconnecting calendar:', error)
    throw error
  }
}

/**
 * Check if driver is available based on calendar events
 */
export async function isDriverAvailableByCalendar(
  driverId: string,
  startTime: Date,
  endTime: Date
): Promise<boolean> {
  // Get driver's calendar events that conflict with the requested time
  const conflicts = await prisma.calendarEvent.findMany({
    where: {
      driverId,
      status: {
        in: ['busy', 'tentative']
      },
      OR: [
        {
          // Event starts during the requested time
          startTime: {
            gte: startTime,
            lt: endTime
          }
        },
        {
          // Event ends during the requested time
          endTime: {
            gt: startTime,
            lte: endTime
          }
        },
        {
          // Event spans the entire requested time
          AND: [
            { startTime: { lte: startTime } },
            { endTime: { gte: endTime } }
          ]
        }
      ]
    }
  })

  return conflicts.length === 0
}

/**
 * Get driver's calendar availability for a date range
 */
export async function getDriverCalendarAvailability(
  driverId: string,
  startDate: Date,
  endDate: Date
) {
  const events = await prisma.calendarEvent.findMany({
    where: {
      driverId,
      startTime: {
        gte: startDate,
        lt: endDate
      }
    },
    orderBy: {
      startTime: 'asc'
    }
  })

  return events
}

/**
 * Sync all active driver calendars (for scheduled job)
 */
export async function syncAllDriverCalendars() {
  const activeCalendars = await prisma.driverCalendar.findMany({
    where: {
      isActive: true
    },
    select: {
      driverId: true
    }
  })

  console.log(`[CALENDAR SYNC] Starting sync for ${activeCalendars.length} driver calendars`)

  const results = {
    total: activeCalendars.length,
    success: 0,
    failed: 0,
    errors: [] as string[]
  }

  for (const calendar of activeCalendars) {
    try {
      await syncDriverCalendar(calendar.driverId)
      results.success++
    } catch (error) {
      results.failed++
      results.errors.push(`Driver ${calendar.driverId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  console.log(`[CALENDAR SYNC] Completed: ${results.success} success, ${results.failed} failed`)

  return results
}
