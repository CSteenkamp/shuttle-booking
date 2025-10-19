/**
 * Test Push Notification API (Development Only)
 * POST /api/push/test
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendPushToUser } from '@/lib/push-notifications'

export async function POST(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Not available in production' },
        { status: 403 }
      )
    }

    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Send test notification
    const result = await sendPushToUser(session.user.id, {
      title: '🔔 Test Notification',
      body: 'This is a test push notification. If you see this, push notifications are working!',
      icon: '/icon-192.png',
      data: {
        type: 'TEST',
        timestamp: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: result.success,
      sent: result.sent,
      failed: result.failed
    })
  } catch (error) {
    console.error('Error sending test push:', error)
    return NextResponse.json(
      { error: 'Failed to send test notification' },
      { status: 500 }
    )
  }
}
