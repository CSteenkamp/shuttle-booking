/**
 * Driver Earnings Transactions API
 * GET /api/driver/earnings/transactions
 * Returns detailed earnings transaction history
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'DRIVER') {
      return NextResponse.json(
        { error: 'Unauthorized: Driver access required' },
        { status: 401 }
      )
    }

    const driverId = session.user.driverProfileId
    if (!driverId) {
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 404 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') // PENDING, PROCESSING, PAID
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    const startDate = searchParams.get('startDate') // ISO date string
    const endDate = searchParams.get('endDate') // ISO date string

    // Build where clause
    const where: any = { driverId }

    if (status) {
      where.payoutStatus = status
    }

    if (startDate || endDate) {
      where.tripDate = {}
      if (startDate) {
        where.tripDate.gte = new Date(startDate)
      }
      if (endDate) {
        where.tripDate.lte = new Date(endDate)
      }
    }

    // Fetch transactions
    const [transactions, total] = await Promise.all([
      prisma.driverEarnings.findMany({
        where,
        include: {
          driver: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        },
        orderBy: {
          tripDate: 'desc'
        },
        take: limit,
        skip: offset
      }),
      prisma.driverEarnings.count({ where })
    ])

    // Calculate totals for this result set
    const totals = {
      gross: transactions.reduce((sum, t) => sum + t.totalAmount, 0),
      platformFee: transactions.reduce((sum, t) => sum + t.platformFee, 0),
      net: transactions.reduce((sum, t) => sum + t.netAmount, 0),
      count: transactions.length
    }

    return NextResponse.json({
      success: true,
      transactions: transactions.map(t => ({
        id: t.id,
        tripId: t.tripId,
        bookingId: t.bookingId,
        tripDate: t.tripDate,
        baseAmount: t.baseAmount,
        distanceAmount: t.distanceAmount,
        timeAmount: t.timeAmount,
        totalAmount: t.totalAmount,
        platformFee: t.platformFee,
        netAmount: t.netAmount,
        payoutStatus: t.payoutStatus,
        paidAt: t.paidAt,
        passengerCount: t.passengerCount,
        distance: t.distance,
        duration: t.duration,
        createdAt: t.createdAt
      })),
      totals,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total
      }
    })
  } catch (error) {
    console.error('Error fetching earnings transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}
