import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { userId } = params

    // Check if user exists and is suspended
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.status !== 'SUSPENDED') {
      return NextResponse.json(
        { error: 'User is not suspended' },
        { status: 400 }
      )
    }

    // Update user status to active
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'ACTIVE' }
    })

    return NextResponse.json({
      message: 'User unsuspended successfully'
    })
  } catch (error) {
    console.error('Error unsuspending user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}