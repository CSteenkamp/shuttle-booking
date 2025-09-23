import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const now = new Date()
    const startOfToday = startOfDay(now)
    const endOfToday = endOfDay(now)
    const startOfThisWeek = startOfWeek(now, { weekStartsOn: 1 })
    const endOfThisWeek = endOfWeek(now, { weekStartsOn: 1 })
    const startOfThisMonth = startOfMonth(now)
    const endOfThisMonth = endOfMonth(now)

    // Get comprehensive statistics in parallel
    const [
      // User statistics
      totalUsers,
      newUsersToday,
      newUsersThisWeek,
      
      // Trip statistics
      totalTrips,
      tripsToday,
      activeTrips,
      completedTrips,
      cancelledTrips,
      
      // Booking statistics
      totalBookings,
      confirmedBookings,
      todayBookings,
      weeklyBookings,
      monthlyBookings,
      cancelledBookings,
      
      // Credit statistics
      allCreditTransactions,
      todayCreditTransactions,
      
      // Current active data
      upcomingTrips,
      currentUsers
    ] = await Promise.all([
      // User counts
      prisma.user.count({
        where: { role: 'CUSTOMER' }
      }),
      prisma.user.count({
        where: {
          role: 'CUSTOMER',
          createdAt: { gte: startOfToday, lte: endOfToday }
        }
      }),
      prisma.user.count({
        where: {
          role: 'CUSTOMER',
          createdAt: { gte: startOfThisWeek, lte: endOfThisWeek }
        }
      }),

      // Trip counts
      prisma.trip.count(),
      prisma.trip.count({
        where: {
          startTime: { gte: startOfToday, lte: endOfToday }
        }
      }),
      prisma.trip.count({
        where: {
          status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
          startTime: { gte: now }
        }
      }),
      prisma.trip.count({
        where: { status: 'COMPLETED' }
      }),
      prisma.trip.count({
        where: { status: 'CANCELLED' }
      }),

      // Booking counts
      prisma.booking.count(),
      prisma.booking.count({
        where: { status: 'CONFIRMED' }
      }),
      prisma.booking.count({
        where: {
          createdAt: { gte: startOfToday, lte: endOfToday }
        }
      }),
      prisma.booking.count({
        where: {
          createdAt: { gte: startOfThisWeek, lte: endOfThisWeek }
        }
      }),
      prisma.booking.count({
        where: {
          createdAt: { gte: startOfThisMonth, lte: endOfThisMonth }
        }
      }),
      prisma.booking.count({
        where: { status: 'CANCELLED' }
      }),

      // Credit transactions (exclude admin transactions from revenue)
      prisma.creditTransaction.findMany({
        include: {
          user: {
            select: { role: true }
          }
        },
        select: { 
          type: true, 
          amount: true, 
          createdAt: true,
          user: {
            select: { role: true }
          }
        }
      }),
      prisma.creditTransaction.findMany({
        where: {
          createdAt: { gte: startOfToday, lte: endOfToday }
        },
        include: {
          user: {
            select: { role: true }
          }
        },
        select: { 
          type: true, 
          amount: true,
          user: {
            select: { role: true }
          }
        }
      }),

      // Active data
      prisma.trip.findMany({
        where: {
          status: 'SCHEDULED',
          startTime: { gte: now }
        },
        take: 5,
        orderBy: { startTime: 'asc' },
        include: {
          destination: { select: { name: true } },
          _count: { select: { bookings: true } }
        }
      }),

      // User credit balances
      prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        include: {
          creditBalance: { select: { credits: true } },
          _count: { select: { bookings: true } }
        }
      })
    ])

    // Calculate credit statistics (exclude admin transactions from revenue)
    
    // Only count CUSTOMER purchases as revenue-generating
    const customerPurchases = allCreditTransactions
      .filter(t => t.type === 'PURCHASE' && t.user.role === 'CUSTOMER')
      .reduce((sum, t) => sum + t.amount, 0)

    // Admin adjustments for customers (support/compensation)
    const adminAdjustmentsForCustomers = allCreditTransactions
      .filter(t => t.type === 'ADMIN_ADJUSTMENT' && t.amount > 0 && t.user.role === 'CUSTOMER')
      .reduce((sum, t) => sum + t.amount, 0)

    // Total credits issued = customer purchases + admin adjustments for customers + admin self-credits
    const totalCreditsIssued = allCreditTransactions
      .filter(t => ['PURCHASE', 'ADMIN_ADJUSTMENT'].includes(t.type) && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)

    const totalCreditsUsed = allCreditTransactions
      .filter(t => t.type === 'USAGE')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const totalCreditsRefunded = allCreditTransactions
      .filter(t => t.type === 'REFUND')
      .reduce((sum, t) => sum + t.amount, 0)

    const todayCreditsActivity = todayCreditTransactions.reduce((acc, t) => {
      if (t.type === 'PURCHASE' && t.user.role === 'CUSTOMER') {
        acc.customerPurchases += t.amount
      } else if (t.type === 'ADMIN_ADJUSTMENT' && t.amount > 0) {
        if (t.user.role === 'CUSTOMER') {
          acc.customerAdjustments += t.amount
        } else {
          acc.adminCredits += t.amount
        }
      } else if (t.type === 'USAGE') {
        acc.used += Math.abs(t.amount)
      } else if (t.type === 'REFUND') {
        acc.refunded += t.amount
      }
      return acc
    }, { customerPurchases: 0, customerAdjustments: 0, adminCredits: 0, used: 0, refunded: 0 })

    // Calculate total current credits in circulation
    const totalCurrentCredits = currentUsers.reduce((sum, user) => {
      return sum + (user.creditBalance?.credits || 0)
    }, 0)

    // Calculate revenue (assume 1 credit = R25 for now, this could be configurable)
    const creditValue = 25 // This should come from settings in the future
    
    // Revenue = only customer purchases + admin adjustments for customers (compensation)
    const totalRevenue = (customerPurchases + adminAdjustmentsForCustomers) * creditValue
    const todayRevenue = (todayCreditsActivity.customerPurchases + todayCreditsActivity.customerAdjustments) * creditValue

    // Calculate average bookings per user
    const avgBookingsPerUser = totalUsers > 0 ? Math.round((totalBookings / totalUsers) * 10) / 10 : 0

    // Calculate trip utilization
    const totalTripCapacity = await prisma.trip.aggregate({
      _sum: { maxPassengers: true }
    })
    const totalPassengerSlots = totalTripCapacity._sum.maxPassengers || 0
    const utilizationRate = totalPassengerSlots > 0 ? Math.round((confirmedBookings / totalPassengerSlots) * 100) : 0

    const stats = {
      // Core metrics
      totalUsers,
      totalTrips,
      totalBookings,
      totalRevenue,
      
      // Today's activity
      todayBookings,
      newUsersToday,
      todayRevenue,
      todayCreditActivity: todayCreditsActivity,
      
      // Weekly/Monthly trends
      newUsersThisWeek,
      weeklyBookings,
      monthlyBookings,
      
      // Trip status breakdown
      activeTrips,
      completedTrips,
      cancelledTrips,
      tripsToday,
      
      // Booking status breakdown
      confirmedBookings,
      cancelledBookings,
      pendingBookings: confirmedBookings, // Bookings for future trips
      
      // Credit metrics
      totalCreditsIssued,
      totalCreditsUsed,
      totalCreditsRefunded,
      totalCurrentCredits,
      creditValue,
      
      // Revenue breakdown
      customerPurchases,
      adminAdjustmentsForCustomers,
      
      // Performance metrics
      avgBookingsPerUser,
      utilizationRate,
      
      // Quick insights
      upcomingTrips: upcomingTrips.map(trip => ({
        id: trip.id,
        destination: trip.destination.name,
        startTime: trip.startTime,
        bookings: trip._count.bookings,
        maxPassengers: trip.maxPassengers
      })),
      
      // System health
      activeUsersWithCredits: currentUsers.filter(u => (u.creditBalance?.credits || 0) > 0).length,
      usersWithBookings: currentUsers.filter(u => u._count.bookings > 0).length
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}