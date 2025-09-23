import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { NotificationService } from '@/lib/notifications'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const active = searchParams.get('active')

    const where: any = {}
    if (active !== null) {
      where.active = active === 'true'
    }

    const announcements = await prisma.systemAnnouncement.findMany({
      where,
      include: {
        creator: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    })

    const total = await prisma.systemAnnouncement.count({ where })

    return NextResponse.json({
      announcements,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  } catch (error) {
    console.error('Error fetching announcements:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      title,
      message,
      priority,
      targetRole,
      showOnLogin,
      showInApp,
      sendEmail,
      sendSms,
      expiresAt
    } = body

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      )
    }

    const announcement = await NotificationService.createAnnouncement({
      title,
      message,
      priority,
      targetRole,
      showOnLogin,
      showInApp,
      sendEmail,
      sendSms,
      expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      createdBy: session.user.id
    })

    return NextResponse.json(announcement, { status: 201 })
  } catch (error) {
    console.error('Error creating announcement:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}