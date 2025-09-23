import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { NotificationService } from '@/lib/notifications'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const unreadCount = await NotificationService.getUnreadCount(session.user.id)

    return NextResponse.json({ unreadCount })
  } catch (error) {
    console.error('Error fetching notification count:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}