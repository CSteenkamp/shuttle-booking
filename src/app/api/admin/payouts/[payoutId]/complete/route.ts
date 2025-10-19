/**
 * Complete Driver Payout API
 * POST /api/admin/payouts/[payoutId]/complete
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { completeDriverPayout } from '@/lib/payfast'

export async function POST(
  request: NextRequest,
  { params }: { params: { payoutId: string } }
) {
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
    const { reference } = body

    if (!reference) {
      return NextResponse.json(
        { error: 'Payment reference is required' },
        { status: 400 }
      )
    }

    const result = await completeDriverPayout(params.payoutId, reference)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to complete payout' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Payout completed successfully'
    })
  } catch (error) {
    console.error('Error completing payout:', error)
    return NextResponse.json(
      { error: 'Failed to complete payout' },
      { status: 500 }
    )
  }
}
