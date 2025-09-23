import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { amount } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    // Update credits in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update credit balance
      const updatedBalance = await tx.creditBalance.upsert({
        where: { userId: session.user.id },
        update: {
          credits: {
            increment: amount,
          }
        },
        create: {
          userId: session.user.id,
          credits: amount,
        }
      })

      // Create credit transaction record
      await tx.creditTransaction.create({
        data: {
          userId: session.user.id,
          type: 'PURCHASE',
          amount: amount,
          description: `Credit purchase - ${amount} credits added`,
        }
      })

      return updatedBalance
    })

    return NextResponse.json({ 
      message: 'Credits added successfully',
      credits: result.credits 
    })
  } catch (error) {
    console.error('Error adding credits:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}