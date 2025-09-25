import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: {
    paymentId: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { paymentId } = params

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      )
    }

    // Get payment transaction details
    const paymentTransaction = await prisma.paymentTransaction.findFirst({
      where: {
        id: paymentId,
        userId: session.user.id // Ensure user can only check their own payments
      },
      include: {
        package: {
          select: {
            id: true,
            name: true,
            credits: true,
            price: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    })

    if (!paymentTransaction) {
      return NextResponse.json(
        { error: 'Payment transaction not found' },
        { status: 404 }
      )
    }

    // Prepare response data
    const responseData = {
      id: paymentTransaction.id,
      merchantTxnId: paymentTransaction.merchantTxnId,
      status: paymentTransaction.status,
      amount: paymentTransaction.amount,
      credits: paymentTransaction.credits,
      createdAt: paymentTransaction.createdAt,
      updatedAt: paymentTransaction.updatedAt,
      completedAt: paymentTransaction.completedAt,
      package: paymentTransaction.package,
      // Only include PayFast payment ID if payment is completed
      payfastPaymentId: paymentTransaction.status === 'COMPLETED' ? paymentTransaction.payfastPaymentId : undefined
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Error fetching payment status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment status' },
      { status: 500 }
    )
  }
}

// Get payment history for user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { limit = 10, offset = 0 } = await request.json()

    // Get user's payment history
    const paymentTransactions = await prisma.paymentTransaction.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        package: {
          select: {
            id: true,
            name: true,
            credits: true,
            price: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: Math.min(limit, 50), // Max 50 records per request
      skip: offset
    })

    // Get total count for pagination
    const totalCount = await prisma.paymentTransaction.count({
      where: {
        userId: session.user.id
      }
    })

    const responseData = {
      payments: paymentTransactions.map(payment => ({
        id: payment.id,
        merchantTxnId: payment.merchantTxnId,
        status: payment.status,
        amount: payment.amount,
        credits: payment.credits,
        createdAt: payment.createdAt,
        completedAt: payment.completedAt,
        package: payment.package,
        payfastPaymentId: payment.status === 'COMPLETED' ? payment.payfastPaymentId : undefined
      })),
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: (offset + limit) < totalCount
      }
    }

    return NextResponse.json(responseData)

  } catch (error) {
    console.error('Error fetching payment history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payment history' },
      { status: 500 }
    )
  }
}