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

    const preferences = await NotificationService.getPreferences(session.user.id)

    return NextResponse.json(preferences)
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
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
    
    // Validate that reminderHours and secondReminderMinutes are positive numbers
    if (body.reminderHours !== undefined && (body.reminderHours < 1 || body.reminderHours > 168)) {
      return NextResponse.json(
        { error: 'Reminder hours must be between 1 and 168 (1 week)' },
        { status: 400 }
      )
    }

    if (body.secondReminderMinutes !== undefined && (body.secondReminderMinutes < 5 || body.secondReminderMinutes > 1440)) {
      return NextResponse.json(
        { error: 'Second reminder minutes must be between 5 and 1440 (24 hours)' },
        { status: 400 }
      )
    }

    const preferences = await NotificationService.updatePreferences(session.user.id, body)

    return NextResponse.json(preferences)
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}