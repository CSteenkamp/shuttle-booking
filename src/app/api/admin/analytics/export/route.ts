/**
 * Analytics Export API
 * GET /api/admin/analytics/export?type=revenue|bookings|drivers|cities
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  getRevenueTimeSeries,
  getBookingTrends,
  getTopDrivers,
  getCityPerformance
} from '@/lib/admin-analytics'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'revenue'
    const days = parseInt(searchParams.get('days') || '30', 10)

    let data: any[] = []
    let filename = 'export.csv'
    let headers: string[] = []

    switch (type) {
      case 'revenue':
        data = await getRevenueTimeSeries(days)
        filename = `revenue_${days}days.csv`
        headers = ['Date', 'Revenue', 'Platform Fee', 'Bookings']
        break

      case 'bookings':
        data = await getBookingTrends(days)
        filename = `bookings_${days}days.csv`
        headers = ['Date', 'Total Bookings', 'Completed', 'Cancelled']
        break

      case 'drivers':
        data = await getTopDrivers(50)
        filename = 'top_drivers.csv'
        headers = ['Name', 'Email', 'City', 'Completed Trips', 'Total Earnings', 'Average Rating', 'Acceptance Rate']
        break

      case 'cities':
        data = await getCityPerformance(20)
        filename = 'city_performance.csv'
        headers = ['City', 'Revenue', 'Bookings', 'Active Drivers', 'Completed Trips', 'Average Rating', 'Growth %']
        break

      default:
        return NextResponse.json(
          { error: 'Invalid export type' },
          { status: 400 }
        )
    }

    // Generate CSV
    let csv = headers.join(',') + '\n'

    data.forEach(row => {
      switch (type) {
        case 'revenue':
          csv += `${row.date},${row.revenue},${row.platformFee},${row.bookings}\n`
          break
        case 'bookings':
          csv += `${row.date},${row.bookings},${row.completed},${row.cancelled}\n`
          break
        case 'drivers':
          csv += `"${row.driverName}",${row.email},${row.city},${row.completedTrips},${row.totalEarnings},${row.averageRating},${row.acceptanceRate}\n`
          break
        case 'cities':
          csv += `${row.cityName},${row.revenue},${row.bookings},${row.activeDrivers},${row.completedTrips},${row.averageRating},${row.growth}\n`
          break
      }
    })

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error) {
    console.error('Error exporting analytics:', error)
    return NextResponse.json(
      { error: 'Failed to export data' },
      { status: 500 }
    )
  }
}
