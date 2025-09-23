import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const creditBalance = await prisma.creditBalance.findUnique({
      where: {
        userId: session.user.id,
      },
    })

    if (!creditBalance) {
      // Create credit balance if it doesn't exist
      const newBalance = await prisma.creditBalance.create({
        data: {
          userId: session.user.id,
          credits: 0,
        },
      })
      return NextResponse.json({ credits: newBalance.credits })
    }

    return NextResponse.json({ credits: creditBalance.credits })
  } catch (error) {
    console.error('Error fetching user credits:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}