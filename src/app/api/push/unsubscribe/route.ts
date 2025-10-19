/**
 * Push Notification Unsubscribe API
 * POST /api/push/unsubscribe
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { unsubscribeFromPush } from '@/lib/push-notifications'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { endpoint } = body

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint is required' },
        { status: 400 }
      )
    }

    const result = await unsubscribeFromPush(endpoint)

    return NextResponse.json({
      success: result.success,
      message: result.success
        ? 'Successfully unsubscribed from push notifications'
        : 'Failed to unsubscribe'
    })
  } catch (error) {
    console.error('Error unsubscribing from push:', error)
    return NextResponse.json(
      { error: 'Failed to unsubscribe from push notifications' },
      { status: 500 }
    )
  }
}
