import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user's calendar preference from settings
    const preference = await prisma.settings.findUnique({
      where: { key: `calendar_preference_${session.user.id}` }
    })

    return NextResponse.json({
      provider: preference?.value || 'google'
    })
  } catch (error) {
    console.error('Error fetching calendar preference:', error)
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

    const { provider } = await request.json()

    if (!provider || !['google', 'outlook', 'apple', 'ics'].includes(provider)) {
      return NextResponse.json(
        { error: 'Invalid calendar provider' },
        { status: 400 }
      )
    }

    // Save user's calendar preference
    await prisma.settings.upsert({
      where: { key: `calendar_preference_${session.user.id}` },
      update: { 
        value: provider,
        description: `Calendar preference for user ${session.user.email}`
      },
      create: { 
        key: `calendar_preference_${session.user.id}`,
        value: provider,
        description: `Calendar preference for user ${session.user.email}`
      }
    })

    return NextResponse.json({ 
      message: 'Calendar preference saved',
      provider 
    })
  } catch (error) {
    console.error('Error saving calendar preference:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}