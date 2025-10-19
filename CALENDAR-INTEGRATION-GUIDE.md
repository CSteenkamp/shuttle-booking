# Driver Calendar Integration Guide

This guide explains how to set up and use the Google Calendar integration for driver availability management.

## Overview

The calendar integration allows drivers to sync their Google Calendar, automatically blocking their availability when they have personal appointments or commitments. This ensures drivers are only assigned to trips when they're actually available.

## Features

- **OAuth2 Authentication**: Secure connection to driver's Google Calendar
- **Automatic Sync**: Periodic background sync of calendar events
- **Manual Sync**: Drivers can trigger sync on-demand
- **Availability Checking**: Automatic conflict detection during driver assignment
- **Calendar Management**: Drivers can connect/disconnect calendars at any time

## Setup Instructions

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

4. Create OAuth2 Credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client ID"
   - Configure the OAuth consent screen if prompted:
     - User Type: External (for testing) or Internal (for organization)
     - Add app name, support email, and developer contact
     - Add scopes: `calendar.readonly` and `calendar.events.readonly`
     - Add test users (if using External type)
   - For Application Type, select "Web application"
   - Add Authorized Redirect URIs:
     - Development: `http://localhost:3000/api/driver/calendar/callback`
     - Production: `https://yourdomain.com/api/driver/calendar/callback`
   - Click "Create"
   - Save the Client ID and Client Secret

### 2. Environment Variables

Add the following to your `.env` file:

```env
# Google Calendar OAuth
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/driver/calendar/callback

# Cron Security (for automated sync)
CRON_SECRET=your_random_secret_here
```

**Production Environment:**
```env
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/driver/calendar/callback
```

### 3. Database Migration

The calendar integration requires new tables in the database. Make sure you've run the Prisma migration:

```bash
npx prisma migrate dev
npx prisma generate
```

The following tables are used:
- `DriverCalendar` - Stores OAuth tokens and calendar connection info
- `CalendarEvent` - Stores synced calendar events for availability checking

## API Endpoints

### Driver Endpoints

#### 1. Connect Calendar
**GET** `/api/driver/calendar/connect`

Returns the Google OAuth authorization URL. Redirect the driver to this URL to initiate the connection.

**Response:**
```json
{
  "success": true,
  "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..."
}
```

#### 2. OAuth Callback
**GET** `/api/driver/calendar/callback`

Handles the OAuth redirect from Google. This endpoint is called automatically after the driver authorizes access.

**Query Parameters:**
- `code` - Authorization code from Google
- `state` - Driver ID (passed automatically)

**Redirects to:**
- Success: `/driver/dashboard?calendar_connected=true`
- Error: `/driver/dashboard?calendar_error=<error_code>`

#### 3. Get Calendar Status
**GET** `/api/driver/calendar`

Returns the current calendar connection status and upcoming events.

**Response:**
```json
{
  "connected": true,
  "calendar": {
    "id": "cal_123",
    "provider": "GOOGLE",
    "calendarName": "My Calendar",
    "isActive": true,
    "lastSyncedAt": "2025-10-13T10:00:00Z",
    "syncStatus": "SUCCESS",
    "syncError": null
  },
  "upcomingEvents": [
    {
      "id": "evt_123",
      "title": "Doctor Appointment",
      "startTime": "2025-10-14T14:00:00Z",
      "endTime": "2025-10-14T15:00:00Z",
      "status": "busy"
    }
  ],
  "eventsCount": 5
}
```

#### 4. Manual Sync
**POST** `/api/driver/calendar/sync`

Triggers an immediate sync of the driver's calendar.

**Response:**
```json
{
  "success": true,
  "message": "Synced 12 calendar events",
  "eventsCount": 12,
  "syncedAt": "2025-10-13T10:30:00Z"
}
```

#### 5. Disconnect Calendar
**DELETE** `/api/driver/calendar`

Disconnects the calendar and removes all synced events.

**Response:**
```json
{
  "success": true,
  "message": "Calendar disconnected successfully"
}
```

### Admin/Cron Endpoint

#### Automated Calendar Sync
**GET** `/api/cron/sync-calendars`

Syncs all active driver calendars. Should be called by a scheduled cron job.

**Headers:**
```
Authorization: Bearer <CRON_SECRET>
```

**Response:**
```json
{
  "success": true,
  "message": "Calendar sync completed",
  "results": {
    "total": 15,
    "success": 14,
    "failed": 1,
    "errors": ["Driver xyz: Token expired"]
  }
}
```

## Setting Up Automated Sync

### Option 1: Vercel Cron (Recommended for Vercel deployments)

Create `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-calendars",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

This runs every 15 minutes.

### Option 2: GitHub Actions

Create `.github/workflows/calendar-sync.yml`:

```yaml
name: Sync Driver Calendars

on:
  schedule:
    - cron: '*/15 * * * *' # Every 15 minutes

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Calendar Sync
        run: |
          curl -X GET https://yourdomain.com/api/cron/sync-calendars \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### Option 3: External Cron Service

Use services like:
- [cron-job.org](https://cron-job.org)
- [EasyCron](https://www.easycron.com)
- [Crontab.guru](https://crontab.guru) (for self-hosted)

Configure to call: `GET https://yourdomain.com/api/cron/sync-calendars`
With header: `Authorization: Bearer YOUR_CRON_SECRET`

## How It Works

### 1. Calendar Connection Flow

```
Driver Dashboard → Connect Calendar Button → Google OAuth Screen →
Authorize Access → Callback Handler → Store Tokens → Initial Sync →
Show Connected Status
```

### 2. Availability Checking

When a trip is created or a driver is being assigned:

1. System finds all drivers in the area
2. For each driver with a connected calendar:
   - Checks for calendar events during the trip time
   - If event exists with status "busy" or "tentative", driver is marked unavailable
3. Only available drivers are considered for assignment
4. Best available driver is automatically assigned

### 3. Sync Process

**Initial Sync** (on connection):
- Fetches events for next 30 days
- Stores all events in database
- Updates sync status

**Periodic Sync** (every 15 minutes):
- Updates events for next 30 days
- Removes old events
- Adds new/updated events
- Handles token refresh if expired

**Manual Sync** (driver-initiated):
- Same as periodic sync
- Provides immediate feedback

## Calendar Event Handling

### Event Status Mapping

- `busy` - Driver unavailable (confirmed events)
- `tentative` - Driver might be unavailable (tentative events)
- `free` - Driver available (free/busy indicator showing free)

### Event Filtering

Only events with defined start/end times are synced. All-day events and events without times are ignored.

### Conflict Detection

A conflict exists if:
- Event starts during the trip time, OR
- Event ends during the trip time, OR
- Event spans the entire trip time

## Security Considerations

1. **Token Storage**: OAuth tokens are encrypted at rest in the database
2. **Scope Limitation**: Only read-only calendar access is requested
3. **Refresh Tokens**: Automatically refreshed when expired
4. **Cron Protection**: Cron endpoint requires secret authorization
5. **User Control**: Drivers can disconnect at any time

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `connection_failed` | OAuth process failed | Retry connection, check credentials |
| `token_expired` | Refresh token invalid | Reconnect calendar |
| `missing_params` | OAuth callback missing data | Check redirect URI configuration |
| `driver_not_found` | Invalid driver ID in state | Verify user session |
| `sync_failed` | Google API error | Check API quota, retry later |

### Sync Status Values

- `SUCCESS` - Last sync completed successfully
- `FAILED` - Last sync failed (check syncError field)
- `PENDING` - Sync never completed

### Handling Failed Syncs

If a driver's calendar sync fails:
1. System logs the error
2. Updates `syncStatus` to `FAILED`
3. Stores error message in `syncError`
4. Driver availability checking continues (ignores calendar)
5. Next scheduled sync will retry

## Testing

### Manual Testing

1. **Test Connection:**
   ```bash
   # Get auth URL
   curl -X GET http://localhost:3000/api/driver/calendar/connect \
     -H "Cookie: your-session-cookie"

   # Visit the returned authUrl in browser
   # Should redirect to callback and show success
   ```

2. **Test Sync:**
   ```bash
   curl -X POST http://localhost:3000/api/driver/calendar/sync \
     -H "Cookie: your-session-cookie"
   ```

3. **Test Status:**
   ```bash
   curl -X GET http://localhost:3000/api/driver/calendar \
     -H "Cookie: your-session-cookie"
   ```

4. **Test Cron:**
   ```bash
   curl -X GET http://localhost:3000/api/cron/sync-calendars \
     -H "Authorization: Bearer your-cron-secret"
   ```

### Integration Testing

Create calendar events in Google Calendar and verify:
1. Events sync correctly
2. Driver becomes unavailable during event times
3. Trip assignment skips busy drivers
4. Manual sync updates events immediately

## Monitoring

### Key Metrics to Track

1. **Sync Success Rate**: Percentage of successful syncs
2. **Sync Duration**: Time taken for each sync operation
3. **Calendar Connections**: Number of active calendar connections
4. **API Quota Usage**: Google Calendar API calls per day
5. **Failed Syncs**: Drivers with failing syncs

### Logging

All calendar operations are logged with prefix `[CALENDAR SYNC]`:
- Connection attempts
- Sync operations
- Errors and failures
- Token refreshes

Check logs for:
```
[CALENDAR SYNC] Successfully synced 12 events for driver driver_123
[CALENDAR SYNC] Starting sync for 15 driver calendars
[CALENDAR SYNC] Completed: 14 success, 1 failed
```

## Troubleshooting

### Driver can't connect calendar

**Check:**
1. GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set
2. Redirect URI matches in Google Console and .env
3. Driver has DRIVER role
4. OAuth consent screen is configured

### Calendar sync failing

**Check:**
1. Token hasn't been revoked
2. API quota not exceeded
3. Calendar still exists and accessible
4. Network connectivity to Google APIs

### Driver still getting assigned during busy times

**Check:**
1. Calendar is connected and active
2. Last sync was successful
3. Event times are correct (consider timezone)
4. Event status is "busy" or "tentative"

### Cron sync not running

**Check:**
1. Cron job is configured correctly
2. CRON_SECRET matches in job and .env
3. Endpoint is accessible
4. Check deployment platform logs

## Maintenance

### Regular Tasks

1. **Monitor sync failures** - Check `syncStatus` and `syncError` fields
2. **Review API quota** - Ensure within Google Calendar API limits
3. **Clean old events** - Database cleanup for events older than 30 days (handled automatically)
4. **Update OAuth credentials** - Rotate secrets periodically
5. **Review logs** - Check for unusual patterns or errors

### Database Cleanup

Old calendar events are automatically removed during sync (events are refreshed each sync). Manual cleanup:

```sql
-- Remove events older than 30 days
DELETE FROM "CalendarEvent"
WHERE "endTime" < NOW() - INTERVAL '30 days';
```

## Future Enhancements

Potential improvements for Phase 2+:
- Support for iCloud Calendar (via CalDAV)
- Support for Outlook Calendar
- Two-way sync (write blocks to calendar)
- Smart scheduling suggestions
- Calendar event creation from bookings
- Multiple calendar support per driver
- Timezone-aware sync
- Custom availability rules overlay

## Support

For issues or questions:
1. Check logs for error messages
2. Verify environment variables
3. Test OAuth flow manually
4. Review Google Calendar API quotas
5. Consult Google Calendar API documentation

## References

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [OAuth 2.0 for Web Apps](https://developers.google.com/identity/protocols/oauth2/web-server)
- [googleapis npm package](https://www.npmjs.com/package/googleapis)
