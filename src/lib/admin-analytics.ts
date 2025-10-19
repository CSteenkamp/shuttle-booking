/**
 * Admin Analytics Library
 * Aggregates platform-wide metrics for admin dashboard
 */

import { prisma } from '@/lib/prisma'
import { BookingStatus, AssignmentStatus } from '@prisma/client'

export interface PlatformMetrics {
  // Revenue metrics
  revenue: {
    today: number
    week: number
    month: number
    allTime: number
    platformFees: {
      today: number
      week: number
      month: number
      allTime: number
    }
  }

  // User metrics
  users: {
    total: number
    active: number
    new: {
      today: number
      week: number
      month: number
    }
    byRole: {
      customers: number
      drivers: number
      admins: number
    }
  }

  // Driver metrics
  drivers: {
    total: number
    approved: number
    pending: number
    rejected: number
    online: number
    activeToday: number
  }

  // Booking metrics
  bookings: {
    total: number
    today: number
    week: number
    month: number
    byStatus: {
      confirmed: number
      cancelled: number
      completed: number
      pending: number
    }
  }

  // Trip metrics
  trips: {
    total: number
    today: number
    week: number
    month: number
    completed: number
    inProgress: number
    cancelled: number
    averageRating: number
  }
}

export interface CityPerformance {
  cityId: string
  cityName: string
  bookings: number
  revenue: number
  activeDrivers: number
  completedTrips: number
  averageRating: number
  growth: number // percentage
}

export interface DriverPerformance {
  driverId: string
  driverName: string
  email: string
  city: string
  completedTrips: number
  totalEarnings: number
  averageRating: number
  acceptanceRate: number
  onlineHours: number
  status: string
}

export interface RevenueTimeSeries {
  date: string
  revenue: number
  platformFee: number
  bookings: number
}

export interface BookingTrend {
  date: string
  bookings: number
  completed: number
  cancelled: number
}

/**
 * Get comprehensive platform metrics
 */
export async function getPlatformMetrics(): Promise<PlatformMetrics> {
  const now = new Date()
  const todayStart = new Date(now.setHours(0, 0, 0, 0))
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // Get all earnings for revenue calculation
  const allEarnings = await prisma.driverEarnings.findMany({
    select: {
      totalAmount: true,
      platformFee: true,
      createdAt: true
    }
  })

  // Calculate revenue by period
  const todayEarnings = allEarnings.filter(e => e.createdAt >= todayStart)
  const weekEarnings = allEarnings.filter(e => e.createdAt >= weekStart)
  const monthEarnings = allEarnings.filter(e => e.createdAt >= monthStart)

  const revenue = {
    today: todayEarnings.reduce((sum, e) => sum + e.totalAmount, 0),
    week: weekEarnings.reduce((sum, e) => sum + e.totalAmount, 0),
    month: monthEarnings.reduce((sum, e) => sum + e.totalAmount, 0),
    allTime: allEarnings.reduce((sum, e) => sum + e.totalAmount, 0),
    platformFees: {
      today: todayEarnings.reduce((sum, e) => sum + e.platformFee, 0),
      week: weekEarnings.reduce((sum, e) => sum + e.platformFee, 0),
      month: monthEarnings.reduce((sum, e) => sum + e.platformFee, 0),
      allTime: allEarnings.reduce((sum, e) => sum + e.platformFee, 0)
    }
  }

  // User metrics
  const [totalUsers, newToday, newWeek, newMonth] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.user.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } })
  ])

  const [customers, drivers, admins] = await Promise.all([
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.user.count({ where: { role: 'DRIVER' } }),
    prisma.user.count({ where: { role: 'ADMIN' } })
  ])

  // Active users (logged in within last 7 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const activeUsers = await prisma.user.count({
    where: {
      lastLoginAt: { gte: sevenDaysAgo }
    }
  })

  const users = {
    total: totalUsers,
    active: activeUsers,
    new: {
      today: newToday,
      week: newWeek,
      month: newMonth
    },
    byRole: {
      customers,
      drivers,
      admins
    }
  }

  // Driver metrics
  const [totalDrivers, approvedDrivers, pendingDrivers, rejectedDrivers, onlineDrivers] = await Promise.all([
    prisma.driverProfile.count(),
    prisma.driverProfile.count({ where: { status: 'APPROVED' } }),
    prisma.driverProfile.count({ where: { status: 'PENDING' } }),
    prisma.driverProfile.count({ where: { status: 'REJECTED' } }),
    prisma.driverProfile.count({ where: { isOnline: true } })
  ])

  // Drivers active today (completed at least one trip)
  const activeDriversToday = await prisma.tripAssignment.findMany({
    where: {
      status: AssignmentStatus.COMPLETED,
      completedAt: { gte: todayStart }
    },
    select: { driverId: true },
    distinct: ['driverId']
  })

  const driversMetrics = {
    total: totalDrivers,
    approved: approvedDrivers,
    pending: pendingDrivers,
    rejected: rejectedDrivers,
    online: onlineDrivers,
    activeToday: activeDriversToday.length
  }

  // Booking metrics
  const [totalBookings, todayBookings, weekBookings, monthBookings] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.booking.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.booking.count({ where: { createdAt: { gte: monthStart } } })
  ])

  const [confirmedBookings, cancelledBookings, completedBookings, pendingBookings] = await Promise.all([
    prisma.booking.count({ where: { status: BookingStatus.CONFIRMED } }),
    prisma.booking.count({ where: { status: BookingStatus.CANCELLED } }),
    prisma.booking.count({ where: { status: BookingStatus.COMPLETED } }),
    prisma.booking.count({ where: { status: BookingStatus.PENDING } })
  ])

  const bookings = {
    total: totalBookings,
    today: todayBookings,
    week: weekBookings,
    month: monthBookings,
    byStatus: {
      confirmed: confirmedBookings,
      cancelled: cancelledBookings,
      completed: completedBookings,
      pending: pendingBookings
    }
  }

  // Trip metrics
  const [totalTrips, todayTrips, weekTrips, monthTrips] = await Promise.all([
    prisma.trip.count(),
    prisma.trip.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.trip.count({ where: { createdAt: { gte: weekStart } } }),
    prisma.trip.count({ where: { createdAt: { gte: monthStart } } })
  ])

  const [completedTrips, inProgressTrips, cancelledTrips] = await Promise.all([
    prisma.tripAssignment.count({ where: { status: AssignmentStatus.COMPLETED } }),
    prisma.tripAssignment.count({ where: { status: AssignmentStatus.IN_PROGRESS } }),
    prisma.tripAssignment.count({ where: { status: AssignmentStatus.CANCELLED } })
  ])

  // Average rating across all drivers
  const allDrivers = await prisma.driverProfile.findMany({
    select: { rating: true, totalRatings: true }
  })

  const totalRatings = allDrivers.reduce((sum, d) => sum + d.totalRatings, 0)
  const weightedRating = allDrivers.reduce((sum, d) => sum + (d.rating * d.totalRatings), 0)
  const averageRating = totalRatings > 0 ? weightedRating / totalRatings : 0

  const trips = {
    total: totalTrips,
    today: todayTrips,
    week: weekTrips,
    month: monthTrips,
    completed: completedTrips,
    inProgress: inProgressTrips,
    cancelled: cancelledTrips,
    averageRating: Math.round(averageRating * 10) / 10
  }

  return {
    revenue,
    users,
    drivers: driversMetrics,
    bookings,
    trips
  }
}

/**
 * Get performance metrics by city
 */
export async function getCityPerformance(limit: number = 10): Promise<CityPerformance[]> {
  const cities = await prisma.city.findMany({
    include: {
      areas: {
        include: {
          drivers: {
            where: { status: 'APPROVED' },
            include: {
              assignments: {
                where: { status: AssignmentStatus.COMPLETED }
              },
              earnings: true
            }
          }
        }
      },
      trips: {
        include: {
          booking: true
        }
      }
    }
  })

  const cityMetrics: CityPerformance[] = cities.map(city => {
    const allDrivers = city.areas.flatMap(area => area.drivers)
    const activeDrivers = allDrivers.filter(d => d.assignments.length > 0).length

    const completedTrips = allDrivers.reduce((sum, d) => sum + d.completedTrips, 0)

    const totalEarnings = allDrivers.reduce((sum, d) =>
      sum + d.earnings.reduce((eSum, e) => eSum + e.totalAmount, 0), 0
    )

    const totalRatings = allDrivers.reduce((sum, d) => sum + d.totalRatings, 0)
    const weightedRating = allDrivers.reduce((sum, d) => sum + (d.rating * d.totalRatings), 0)
    const averageRating = totalRatings > 0 ? weightedRating / totalRatings : 0

    const bookings = city.trips.filter(t => t.booking).length

    // Calculate growth (last 30 days vs previous 30 days)
    const now = new Date()
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const previous30Days = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    const recentBookings = city.trips.filter(t =>
      t.createdAt >= last30Days && t.booking
    ).length

    const previousBookings = city.trips.filter(t =>
      t.createdAt >= previous30Days && t.createdAt < last30Days && t.booking
    ).length

    const growth = previousBookings > 0
      ? ((recentBookings - previousBookings) / previousBookings) * 100
      : 0

    return {
      cityId: city.id,
      cityName: city.name,
      bookings,
      revenue: totalEarnings,
      activeDrivers,
      completedTrips,
      averageRating: Math.round(averageRating * 10) / 10,
      growth: Math.round(growth)
    }
  })

  return cityMetrics
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit)
}

/**
 * Get top performing drivers
 */
export async function getTopDrivers(limit: number = 20): Promise<DriverPerformance[]> {
  const drivers = await prisma.driverProfile.findMany({
    where: { status: 'APPROVED' },
    include: {
      user: {
        select: { name: true, email: true }
      },
      city: {
        select: { name: true }
      },
      assignments: true,
      earnings: true
    },
    orderBy: { completedTrips: 'desc' },
    take: limit * 2 // Get more to filter
  })

  const driverMetrics: DriverPerformance[] = drivers.map(driver => {
    const totalEarnings = driver.earnings.reduce((sum, e) => sum + e.netAmount, 0)

    const totalAssignments = driver.assignments.length
    const acceptedAssignments = driver.assignments.filter(a =>
      a.status === AssignmentStatus.ACCEPTED ||
      a.status === AssignmentStatus.IN_PROGRESS ||
      a.status === AssignmentStatus.COMPLETED
    ).length

    const acceptanceRate = totalAssignments > 0
      ? Math.round((acceptedAssignments / totalAssignments) * 100)
      : 0

    return {
      driverId: driver.id,
      driverName: driver.user.name || 'Unknown',
      email: driver.user.email,
      city: driver.city.name,
      completedTrips: driver.completedTrips,
      totalEarnings,
      averageRating: Math.round(driver.rating * 10) / 10,
      acceptanceRate,
      onlineHours: 0, // TODO: Calculate from status history
      status: driver.status
    }
  })

  return driverMetrics.slice(0, limit)
}

/**
 * Get revenue time series data
 */
export async function getRevenueTimeSeries(days: number = 30): Promise<RevenueTimeSeries[]> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  const earnings = await prisma.driverEarnings.findMany({
    where: {
      createdAt: { gte: startDate }
    },
    orderBy: { createdAt: 'asc' }
  })

  const bookings = await prisma.booking.findMany({
    where: {
      createdAt: { gte: startDate }
    },
    orderBy: { createdAt: 'asc' }
  })

  // Group by date
  const dataByDate = new Map<string, RevenueTimeSeries>()

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

    dataByDate.set(dateStr, {
      date: dateStr,
      revenue: 0,
      platformFee: 0,
      bookings: 0
    })
  }

  // Aggregate earnings
  earnings.forEach(earning => {
    const dateStr = earning.createdAt.toISOString().split('T')[0]
    const data = dataByDate.get(dateStr)
    if (data) {
      data.revenue += earning.totalAmount
      data.platformFee += earning.platformFee
    }
  })

  // Aggregate bookings
  bookings.forEach(booking => {
    const dateStr = booking.createdAt.toISOString().split('T')[0]
    const data = dataByDate.get(dateStr)
    if (data) {
      data.bookings++
    }
  })

  return Array.from(dataByDate.values())
}

/**
 * Get booking trends
 */
export async function getBookingTrends(days: number = 30): Promise<BookingTrend[]> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  startDate.setHours(0, 0, 0, 0)

  const bookings = await prisma.booking.findMany({
    where: {
      createdAt: { gte: startDate }
    },
    include: {
      trip: {
        include: {
          assignment: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  })

  // Group by date
  const dataByDate = new Map<string, BookingTrend>()

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]

    dataByDate.set(dateStr, {
      date: dateStr,
      bookings: 0,
      completed: 0,
      cancelled: 0
    })
  }

  bookings.forEach(booking => {
    const dateStr = booking.createdAt.toISOString().split('T')[0]
    const data = dataByDate.get(dateStr)
    if (data) {
      data.bookings++

      if (booking.status === BookingStatus.COMPLETED) {
        data.completed++
      } else if (booking.status === BookingStatus.CANCELLED) {
        data.cancelled++
      }
    }
  })

  return Array.from(dataByDate.values())
}

/**
 * Get system health metrics
 */
export interface SystemHealth {
  database: {
    connected: boolean
    responseTime: number
  }
  activeConnections: number
  apiHealth: string
  lastBackup?: Date
}

export async function getSystemHealth(): Promise<SystemHealth> {
  const startTime = Date.now()

  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`
    const responseTime = Date.now() - startTime

    return {
      database: {
        connected: true,
        responseTime
      },
      activeConnections: 0, // TODO: Get from connection pool
      apiHealth: 'healthy',
      lastBackup: undefined // TODO: Get from backup system
    }
  } catch (error) {
    return {
      database: {
        connected: false,
        responseTime: Date.now() - startTime
      },
      activeConnections: 0,
      apiHealth: 'degraded'
    }
  }
}
