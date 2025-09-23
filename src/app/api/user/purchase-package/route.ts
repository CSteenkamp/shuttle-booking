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

    const { packageId } = await request.json()

    if (!packageId) {
      return NextResponse.json(
        { error: 'Package ID is required' },
        { status: 400 }
      )
    }

    // Get the credit package
    const creditPackage = await prisma.creditPackage.findUnique({
      where: { id: packageId }
    })

    if (!creditPackage) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      )
    }

    if (!creditPackage.isActive) {
      return NextResponse.json(
        { error: 'Package is not available for purchase' },
        { status: 400 }
      )
    }

    // In a real implementation, this would integrate with a payment gateway
    // For now, we'll simulate the purchase

    // Update credits in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update credit balance
      const updatedBalance = await tx.creditBalance.upsert({
        where: { userId: session.user.id },
        update: {
          credits: {
            increment: creditPackage.credits,
          }
        },
        create: {
          userId: session.user.id,
          credits: creditPackage.credits,
        }
      })

      // Create credit transaction record
      await tx.creditTransaction.create({
        data: {
          userId: session.user.id,
          type: 'PURCHASE',
          amount: creditPackage.credits,
          description: `Package purchase: ${creditPackage.name} (${creditPackage.credits} credits for R${creditPackage.price})`,
        }
      })

      return updatedBalance
    })

    return NextResponse.json({ 
      message: `Successfully purchased ${creditPackage.name}`,
      package: {
        name: creditPackage.name,
        credits: creditPackage.credits,
        price: creditPackage.price
      },
      totalCredits: result.credits 
    })
  } catch (error) {
    console.error('Error purchasing package:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}