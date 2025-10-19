/**
 * Driver Earnings Summary API
 * GET /api/driver/earnings/summary
 * Returns earnings overview with period breakdowns
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfDay, startOfWeek, startOfMonth, endOfDay } from 'date-fns'

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

    const now = new Date()
    const todayStart = startOfDay(now)
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }) // Monday
    const monthStart = startOfMonth(now)

    // Fetch all earnings
    const allEarnings = await prisma.driverEarnings.findMany({
      where: { driverId },
      select: {
        totalAmount: true,
        platformFee: true,
        netAmount: true,
        payoutStatus: true,
        tripDate: true
      }
    })

    // Calculate totals
    const allTimeTotal = allEarnings.reduce((sum, e) => sum + e.totalAmount, 0)
    const allTimePlatformFee = allEarnings.reduce((sum, e) => sum + e.platformFee, 0)
    const allTimeNet = allEarnings.reduce((sum, e) => sum + e.netAmount, 0)

    // Today's earnings
    const todayEarnings = allEarnings.filter(e => e.tripDate >= todayStart)
    const todayTotal = todayEarnings.reduce((sum, e) => sum + e.totalAmount, 0)
    const todayNet = todayEarnings.reduce((sum, e) => sum + e.netAmount, 0)

    // This week's earnings
    const weekEarnings = allEarnings.filter(e => e.tripDate >= weekStart)
    const weekTotal = weekEarnings.reduce((sum, e) => sum + e.totalAmount, 0)
    const weekNet = weekEarnings.reduce((sum, e) => sum + e.netAmount, 0)

    // This month's earnings
    const monthEarnings = allEarnings.filter(e => e.tripDate >= monthStart)
    const monthTotal = monthEarnings.reduce((sum, e) => sum + e.totalAmount, 0)
    const monthNet = monthEarnings.reduce((sum, e) => sum + e.netAmount, 0)

    // Pending payout
    const pendingEarnings = allEarnings.filter(e => e.payoutStatus === 'PENDING')
    const pendingTotal = pendingEarnings.reduce((sum, e) => sum + e.netAmount, 0)

    // Paid out
    const paidEarnings = allEarnings.filter(e => e.payoutStatus === 'PAID')
    const paidTotal = paidEarnings.reduce((sum, e) => sum + e.netAmount, 0)

    // Trip count
    const totalTrips = allEarnings.length
    const todayTrips = todayEarnings.length
    const weekTrips = weekEarnings.length
    const monthTrips = monthEarnings.length

    // Average per trip
    const avgPerTrip = totalTrips > 0 ? Math.round(allTimeNet / totalTrips) : 0

    // Fetch driver profile for total earnings (sanity check)
    const driver = await prisma.driverProfile.findUnique({
      where: { id: driverId },
      select: {
        totalEarnings: true,
        completedTrips: true,
        averageRating: true
      }
    })

    return NextResponse.json({
      success: true,
      summary: {
        allTime: {
          gross: allTimeTotal,
          platformFee: allTimePlatformFee,
          net: allTimeNet,
          trips: totalTrips,
          avgPerTrip
        },
        today: {
          gross: todayTotal,
          net: todayNet,
          trips: todayTrips
        },
        week: {
          gross: weekTotal,
          net: weekNet,
          trips: weekTrips
        },
        month: {
          gross: monthTotal,
          net: monthNet,
          trips: monthTrips
        },
        payout: {
          pending: pendingTotal,
          paid: paidTotal
        },
        profile: {
          totalEarnings: driver?.totalEarnings || 0,
          completedTrips: driver?.completedTrips || 0,
          averageRating: driver?.averageRating || null
        }
      }
    })
  } catch (error) {
    console.error('Error fetching earnings summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch earnings summary' },
      { status: 500 }
    )
  }
}
