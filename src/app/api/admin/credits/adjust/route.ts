import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { userId, amount, description } = await request.json()

    if (!userId || amount === undefined || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const adjustmentAmount = parseInt(amount)
    if (isNaN(adjustmentAmount)) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        creditBalance: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // If removing credits, check if user has enough credits
    if (adjustmentAmount < 0) {
      const currentCredits = user.creditBalance?.credits || 0
      if (currentCredits + adjustmentAmount < 0) {
        return NextResponse.json(
          { error: 'Cannot reduce credits below zero' },
          { status: 400 }
        )
      }
    }

    // Create transaction record
    await prisma.creditTransaction.create({
      data: {
        userId,
        type: 'ADMIN_ADJUSTMENT',
        amount: adjustmentAmount,
        description
      }
    })

    // Update credit balance
    await prisma.creditBalance.upsert({
      where: { userId },
      create: {
        userId,
        credits: Math.max(0, adjustmentAmount)
      },
      update: {
        credits: {
          increment: adjustmentAmount
        }
      }
    })

    return NextResponse.json({ 
      message: 'Credits adjusted successfully',
      amount: adjustmentAmount,
      description
    })
  } catch (error) {
    console.error('Error adjusting credits:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}