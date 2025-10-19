/**
 * Get VAPID Public Key
 * GET /api/push/vapid-key
 */

import { NextResponse } from 'next/server'
import { getPublicVapidKey } from '@/lib/push-notifications'

export async function GET() {
  try {
    const publicKey = getPublicVapidKey()

    if (!publicKey) {
      return NextResponse.json(
        { error: 'Push notifications not configured' },
        { status: 503 }
      )
    }

    return NextResponse.json({
      success: true,
      publicKey
    })
  } catch (error) {
    console.error('Error getting VAPID key:', error)
    return NextResponse.json(
      { error: 'Failed to get VAPID key' },
      { status: 500 }
    )
  }
}
