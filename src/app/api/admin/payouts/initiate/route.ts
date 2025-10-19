/**
 * Initiate Driver Payout API
 * POST /api/admin/payouts/initiate
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { processDriverPayout } from '@/lib/payfast'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user is admin
    const { prisma } = await import('@/lib/prisma')
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { driverId, periodStart, periodEnd } = body

    if (!driverId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'Driver ID and period are required' },
        { status: 400 }
      )
    }

    const result = await processDriverPayout(driverId, {
      start: new Date(periodStart),
      end: new Date(periodEnd)
    })

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to process payout' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      payout: result.payout,
      amount: result.amount
    })
  } catch (error) {
    console.error('Error initiating payout:', error)
    return NextResponse.json(
      { error: 'Failed to initiate payout' },
      { status: 500 }
    )
  }
}
