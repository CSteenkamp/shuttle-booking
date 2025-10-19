import { NextRequest, NextResponse } from 'next/server'
import { syncAllDriverCalendars } from '@/lib/calendar-integration'

/**
 * GET /api/cron/sync-calendars
 * Cron job to sync all driver calendars
 *
 * This endpoint should be called periodically (e.g., every 15 minutes) by a cron service
 * like Vercel Cron, GitHub Actions, or external cron services.
 *
 * Security: Validate cron secret to prevent unauthorized access
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('[CRON] Starting scheduled calendar sync...')

    // Sync all active driver calendars
    const results = await syncAllDriverCalendars()

    console.log(
      `[CRON] Calendar sync completed: ${results.success} success, ${results.failed} failed`
    )

    return NextResponse.json({
      success: true,
      message: 'Calendar sync completed',
      results: {
        total: results.total,
        success: results.success,
        failed: results.failed,
        errors: results.errors
      }
    })

  } catch (error) {
    console.error('[CRON] Error in calendar sync:', error)
    return NextResponse.json(
      {
        error: 'Calendar sync failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
