import { prisma } from '@/lib/prisma'
import { PayoutStatus } from '@prisma/client'

/**
 * Driver Earnings Calculation
 * Handles earning calculations, commission, and payout tracking
 */

export interface EarningsBreakdown {
  baseAmount: number
  distanceAmount: number
  timeAmount: number
  totalAmount: number
  platformFee: number
  netAmount: number
  commissionPercent: number
}

export interface PayoutSummary {
  driverId: string
  driverName: string
  totalEarnings: number
  platformFees: number
  netEarnings: number
  pendingAmount: number
  paidAmount: number
  tripCount: number
  periodStart: Date
  periodEnd: Date
}

/**
 * Calculate earnings for a completed trip
 */
export async function calculateTripEarnings(params: {
  tripId: string
  driverId: string
  bookingId?: string
  passengerCount: number
  distance?: number
  duration?: number
}): Promise<EarningsBreakdown> {
  const { tripId, driverId, bookingId, passengerCount, distance, duration } = params

  try {
    // Get driver profile for rate information
    const driver = await prisma.driverProfile.findUnique({
      where: { id: driverId }
    })

    // Get platform commission setting
    const commissionSetting = await prisma.settings.findUnique({
      where: { key: 'DRIVER_COMMISSION_PERCENT' }
    })

    const commissionPercent = commissionSetting ? parseFloat(commissionSetting.value) : 15

    // Get base rate (use driver's custom rate or default)
    const baseRateSetting = await prisma.settings.findUnique({
      where: { key: 'DEFAULT_DRIVER_BASE_RATE' }
    })

    const baseRate = driver?.baseRate ||
                     (baseRateSetting ? parseInt(baseRateSetting.value) : 30)

    // Calculate components
    const baseAmount = baseRate

    // Distance-based earnings (if driver has per-km rate and distance provided)
    const distanceAmount = (distance && driver?.perKmRate)
      ? Math.round(distance * driver.perKmRate)
      : 0

    // Time-based earnings (if driver has per-minute rate and duration provided)
    const timeAmount = (duration && driver?.perMinuteRate)
      ? Math.round(duration * driver.perMinuteRate)
      : 0

    // Total before commission
    const totalAmount = baseAmount + distanceAmount + timeAmount

    // Calculate platform fee
    const platformFee = Math.round(totalAmount * (commissionPercent / 100))

    // Net amount after commission
    const netAmount = totalAmount - platformFee

    return {
      baseAmount,
      distanceAmount,
      timeAmount,
      totalAmount,
      platformFee,
      netAmount,
      commissionPercent
    }

  } catch (error) {
    console.error('Error calculating trip earnings:', error)
    // Return default/fallback values
    return {
      baseAmount: 30,
      distanceAmount: 0,
      timeAmount: 0,
      totalAmount: 30,
      platformFee: 5,
      netAmount: 25,
      commissionPercent: 15
    }
  }
}

/**
 * Record earnings for a completed trip
 */
export async function recordTripEarnings(params: {
  tripId: string
  driverId: string
  bookingId?: string
  passengerCount: number
  distance?: number
  duration?: number
  tripDate: Date
}): Promise<string> {
  const { tripId, driverId, bookingId, passengerCount, distance, duration, tripDate } = params

  try {
    // Calculate earnings
    const earnings = await calculateTripEarnings({
      tripId,
      driverId,
      bookingId,
      passengerCount,
      distance,
      duration
    })

    // Create earnings record
    const earningRecord = await prisma.driverEarnings.create({
      data: {
        driverId,
        tripId,
        bookingId,
        baseAmount: earnings.baseAmount,
        distanceAmount: earnings.distanceAmount,
        timeAmount: earnings.timeAmount,
        totalAmount: earnings.totalAmount,
        platformFee: earnings.platformFee,
        netAmount: earnings.netAmount,
        payoutStatus: PayoutStatus.PENDING,
        tripDate,
        passengerCount,
        distance,
        duration
      }
    })

    // Update driver's total earnings
    await prisma.driverProfile.update({
      where: { id: driverId },
      data: {
        totalEarnings: { increment: earnings.netAmount },
        completedTrips: { increment: 1 }
      }
    })

    return earningRecord.id

  } catch (error) {
    console.error('Error recording trip earnings:', error)
    throw error
  }
}

/**
 * Get earnings summary for a driver for a specific period
 */
export async function getDriverEarnings(params: {
  driverId: string
  startDate?: Date
  endDate?: Date
  payoutStatus?: PayoutStatus
}): Promise<PayoutSummary> {
  const { driverId, startDate, endDate, payoutStatus } = params

  try {
    // Get driver info
    const driver = await prisma.driverProfile.findUnique({
      where: { id: driverId },
      include: {
        user: {
          select: {
            name: true
          }
        }
      }
    })

    if (!driver) {
      throw new Error('Driver not found')
    }

    // Build where clause
    const whereClause: any = {
      driverId
    }

    if (startDate || endDate) {
      whereClause.tripDate = {}
      if (startDate) whereClause.tripDate.gte = startDate
      if (endDate) whereClause.tripDate.lte = endDate
    }

    if (payoutStatus) {
      whereClause.payoutStatus = payoutStatus
    }

    // Get earnings
    const earnings = await prisma.driverEarnings.findMany({
      where: whereClause,
      orderBy: {
        tripDate: 'desc'
      }
    })

    // Calculate totals
    const totalEarnings = earnings.reduce((sum, e) => sum + e.totalAmount, 0)
    const platformFees = earnings.reduce((sum, e) => sum + e.platformFee, 0)
    const netEarnings = earnings.reduce((sum, e) => sum + e.netAmount, 0)

    const pendingEarnings = earnings.filter(e => e.payoutStatus === PayoutStatus.PENDING)
    const pendingAmount = pendingEarnings.reduce((sum, e) => sum + e.netAmount, 0)

    const paidEarnings = earnings.filter(e => e.payoutStatus === PayoutStatus.PAID)
    const paidAmount = paidEarnings.reduce((sum, e) => sum + e.netAmount, 0)

    return {
      driverId,
      driverName: driver.user.name || 'Unknown',
      totalEarnings,
      platformFees,
      netEarnings,
      pendingAmount,
      paidAmount,
      tripCount: earnings.length,
      periodStart: startDate || new Date(0),
      periodEnd: endDate || new Date()
    }

  } catch (error) {
    console.error('Error getting driver earnings:', error)
    throw error
  }
}

/**
 * Process payout for pending earnings
 */
export async function processPayout(params: {
  driverId: string
  earningIds?: string[]
  processedBy: string
}): Promise<{
  success: boolean
  payoutAmount: number
  earningsCount: number
  message: string
}> {
  const { driverId, earningIds, processedBy } = params

  try {
    // Build where clause
    const whereClause: any = {
      driverId,
      payoutStatus: PayoutStatus.PENDING
    }

    if (earningIds && earningIds.length > 0) {
      whereClause.id = { in: earningIds }
    }

    // Get pending earnings
    const pendingEarnings = await prisma.driverEarnings.findMany({
      where: whereClause
    })

    if (pendingEarnings.length === 0) {
      return {
        success: false,
        payoutAmount: 0,
        earningsCount: 0,
        message: 'No pending earnings found'
      }
    }

    // Calculate total payout
    const payoutAmount = pendingEarnings.reduce((sum, e) => sum + e.netAmount, 0)

    // Update status to PROCESSING
    await prisma.driverEarnings.updateMany({
      where: {
        id: { in: pendingEarnings.map(e => e.id) }
      },
      data: {
        payoutStatus: PayoutStatus.PROCESSING
      }
    })

    // TODO: Integrate with actual payment gateway here
    // For now, we'll just mark as PAID

    // Mark as paid
    const now = new Date()
    await prisma.driverEarnings.updateMany({
      where: {
        id: { in: pendingEarnings.map(e => e.id) }
      },
      data: {
        payoutStatus: PayoutStatus.PAID,
        paidAt: now
      }
    })

    return {
      success: true,
      payoutAmount,
      earningsCount: pendingEarnings.length,
      message: `Successfully processed payout of R${payoutAmount} for ${pendingEarnings.length} trips`
    }

  } catch (error) {
    console.error('Error processing payout:', error)

    // Rollback to PENDING if failed
    if (earningIds) {
      await prisma.driverEarnings.updateMany({
        where: {
          id: { in: earningIds },
          payoutStatus: PayoutStatus.PROCESSING
        },
        data: {
          payoutStatus: PayoutStatus.PENDING
        }
      })
    }

    return {
      success: false,
      payoutAmount: 0,
      earningsCount: 0,
      message: error instanceof Error ? error.message : 'Failed to process payout'
    }
  }
}

/**
 * Get earnings statistics for a driver
 */
export async function getDriverEarningsStats(driverId: string): Promise<{
  today: number
  thisWeek: number
  thisMonth: number
  allTime: number
  averagePerTrip: number
  completedTrips: number
  pendingPayout: number
}> {
  try {
    const now = new Date()

    // Today
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)

    const todayEarnings = await prisma.driverEarnings.aggregate({
      where: {
        driverId,
        tripDate: { gte: todayStart },
        payoutStatus: { not: PayoutStatus.FAILED }
      },
      _sum: {
        netAmount: true
      }
    })

    // This week
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const weekEarnings = await prisma.driverEarnings.aggregate({
      where: {
        driverId,
        tripDate: { gte: weekStart },
        payoutStatus: { not: PayoutStatus.FAILED }
      },
      _sum: {
        netAmount: true
      }
    })

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const monthEarnings = await prisma.driverEarnings.aggregate({
      where: {
        driverId,
        tripDate: { gte: monthStart },
        payoutStatus: { not: PayoutStatus.FAILED }
      },
      _sum: {
        netAmount: true
      }
    })

    // All time
    const allTimeEarnings = await prisma.driverEarnings.aggregate({
      where: {
        driverId,
        payoutStatus: { not: PayoutStatus.FAILED }
      },
      _sum: {
        netAmount: true
      },
      _count: true
    })

    // Pending payout
    const pendingPayout = await prisma.driverEarnings.aggregate({
      where: {
        driverId,
        payoutStatus: PayoutStatus.PENDING
      },
      _sum: {
        netAmount: true
      }
    })

    const completedTrips = allTimeEarnings._count || 0
    const totalEarnings = allTimeEarnings._sum.netAmount || 0
    const averagePerTrip = completedTrips > 0 ? Math.round(totalEarnings / completedTrips) : 0

    return {
      today: todayEarnings._sum.netAmount || 0,
      thisWeek: weekEarnings._sum.netAmount || 0,
      thisMonth: monthEarnings._sum.netAmount || 0,
      allTime: totalEarnings,
      averagePerTrip,
      completedTrips,
      pendingPayout: pendingPayout._sum.netAmount || 0
    }

  } catch (error) {
    console.error('Error getting driver earnings stats:', error)
    return {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      allTime: 0,
      averagePerTrip: 0,
      completedTrips: 0,
      pendingPayout: 0
    }
  }
}
