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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const type = searchParams.get('type') as any

    const notifications = await NotificationService.getUserNotifications(
      session.user.id,
      { limit, offset, unreadOnly, type }
    )

    return NextResponse.json(notifications)
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { action, notificationId, notificationIds } = body

    switch (action) {
      case 'markAsRead':
        if (!notificationId) {
          return NextResponse.json(
            { error: 'Notification ID is required' },
            { status: 400 }
          )
        }
        
        await NotificationService.markAsRead(notificationId, session.user.id)
        return NextResponse.json({ success: true })

      case 'markAllAsRead':
        await NotificationService.markAllAsRead(session.user.id)
        return NextResponse.json({ success: true })

      case 'delete':
        if (!notificationId) {
          return NextResponse.json(
            { error: 'Notification ID is required' },
            { status: 400 }
          )
        }
        
        await NotificationService.deleteNotification(notificationId, session.user.id)
        return NextResponse.json({ success: true })

      case 'bulkDelete':
        if (!notificationIds || !Array.isArray(notificationIds)) {
          return NextResponse.json(
            { error: 'Notification IDs array is required' },
            { status: 400 }
          )
        }
        
        // Delete notifications one by one to ensure user ownership
        for (const id of notificationIds) {
          await NotificationService.deleteNotification(id, session.user.id)
        }
        
        return NextResponse.json({ success: true })

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Error processing notification action:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}