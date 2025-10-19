/**
 * Driver Earnings Export API
 * GET /api/driver/earnings/export
 * Returns earnings data as CSV for download
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const status = searchParams.get('status')

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

    // Fetch all matching transactions
    const transactions = await prisma.driverEarnings.findMany({
      where,
      orderBy: {
        tripDate: 'desc'
      }
    })

    // Generate CSV
    const headers = [
      'Date',
      'Trip ID',
      'Booking ID',
      'Passengers',
      'Distance (km)',
      'Duration (min)',
      'Base Amount',
      'Distance Amount',
      'Time Amount',
      'Gross Total',
      'Platform Fee',
      'Net Earnings',
      'Status',
      'Paid Date'
    ]

    const rows = transactions.map(t => [
      format(t.tripDate, 'yyyy-MM-dd HH:mm'),
      t.tripId,
      t.bookingId || '',
      t.passengerCount || '',
      t.distance?.toFixed(2) || '',
      t.duration || '',
      `R${(t.baseAmount / 100).toFixed(2)}`,
      `R${(t.distanceAmount / 100).toFixed(2)}`,
      `R${(t.timeAmount / 100).toFixed(2)}`,
      `R${(t.totalAmount / 100).toFixed(2)}`,
      `R${(t.platformFee / 100).toFixed(2)}`,
      `R${(t.netAmount / 100).toFixed(2)}`,
      t.payoutStatus,
      t.paidAt ? format(t.paidAt, 'yyyy-MM-dd') : ''
    ])

    // Add summary row
    const totals = [
      'TOTAL',
      '',
      '',
      transactions.reduce((sum, t) => sum + (t.passengerCount || 0), 0),
      transactions.reduce((sum, t) => sum + (t.distance || 0), 0).toFixed(2),
      transactions.reduce((sum, t) => sum + (t.duration || 0), 0),
      `R${(transactions.reduce((sum, t) => sum + t.baseAmount, 0) / 100).toFixed(2)}`,
      `R${(transactions.reduce((sum, t) => sum + t.distanceAmount, 0) / 100).toFixed(2)}`,
      `R${(transactions.reduce((sum, t) => sum + t.timeAmount, 0) / 100).toFixed(2)}`,
      `R${(transactions.reduce((sum, t) => sum + t.totalAmount, 0) / 100).toFixed(2)}`,
      `R${(transactions.reduce((sum, t) => sum + t.platformFee, 0) / 100).toFixed(2)}`,
      `R${(transactions.reduce((sum, t) => sum + t.netAmount, 0) / 100).toFixed(2)}`,
      '',
      ''
    ]

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
      '',
      totals.map(cell => `"${cell}"`).join(',')
    ].join('\n')

    // Generate filename
    const filename = `earnings_${format(new Date(), 'yyyy-MM-dd')}.csv`

    // Return CSV with appropriate headers
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache'
      }
    })
  } catch (error) {
    console.error('Error exporting earnings:', error)
    return NextResponse.json(
      { error: 'Failed to export earnings' },
      { status: 500 }
    )
  }
}
