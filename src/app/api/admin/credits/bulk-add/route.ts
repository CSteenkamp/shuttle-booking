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

    const { amount, description } = await request.json()

    if (!amount || !description) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const creditAmount = parseInt(amount)
    if (isNaN(creditAmount) || creditAmount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    // Get all customer users
    const users = await prisma.user.findMany({
      where: {
        role: 'CUSTOMER'
      },
      select: {
        id: true
      }
    })

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'No customer users found' },
        { status: 404 }
      )
    }

    // Use transaction to ensure all operations succeed or fail together
    await prisma.$transaction(async (tx) => {
      // Create transaction records for all users
      const transactionData = users.map(user => ({
        userId: user.id,
        type: 'ADMIN_ADJUSTMENT' as const,
        amount: creditAmount,
        description
      }))

      await tx.creditTransaction.createMany({
        data: transactionData
      })

      // Update credit balances for all users
      for (const user of users) {
        await tx.creditBalance.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            credits: creditAmount
          },
          update: {
            credits: {
              increment: creditAmount
            }
          }
        })
      }
    })

    return NextResponse.json({ 
      message: 'Bulk credits added successfully',
      usersAffected: users.length,
      amount: creditAmount,
      description
    })
  } catch (error) {
    console.error('Error adding bulk credits:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}