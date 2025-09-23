import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { prisma } from '@/lib/prisma'
import { startOfDay, endOfDay, eachDayOfInterval, format, differenceInDays } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = new Date(searchParams.get('startDate') || new Date())
    const endDate = new Date(searchParams.get('endDate') || new Date())

    // Ensure we have valid date range
    const validStartDate = startOfDay(startDate)
    const validEndDate = endOfDay(endDate)

    // Get comprehensive data for the date range
    const [
      bookings,
      trips,
      users,
      creditTransactions,
      locations
    ] = await Promise.all([
      // Bookings with trip and location data
      prisma.booking.findMany({
        where: {
          createdAt: { gte: validStartDate, lte: validEndDate }
        },
        include: {
          trip: {
            include: {
              destination: true
            }
          },
          pickupLocation: true,
          pickupSavedAddress: true,
          user: {
            select: { role: true }
          }
        }
      }),

      // Trips in the date range
      prisma.trip.findMany({
        where: {
          OR: [
            { createdAt: { gte: validStartDate, lte: validEndDate } },
            { startTime: { gte: validStartDate, lte: validEndDate } }
          ]
        },
        include: {
          destination: true,
          _count: { select: { bookings: true } }
        }
      }),

      // User registrations in the date range
      prisma.user.findMany({
        where: {
          createdAt: { gte: validStartDate, lte: validEndDate },
          role: 'CUSTOMER'
        },
        include: {
          creditBalance: { select: { credits: true } },
          _count: { select: { bookings: true } }
        }
      }),

      // Credit transactions in the date range
      prisma.creditTransaction.findMany({
        where: {
          createdAt: { gte: validStartDate, lte: validEndDate }
        },
        include: {
          user: { select: { role: true } }
        }
      }),

      // All locations for analytics
      prisma.location.findMany({
        include: {
          _count: {
            select: {
              tripsAsDestination: true,
              bookingsAsPickup: true
            }
          }
        }
      })
    ])

    // Generate daily data points for charts
    const dayInterval = eachDayOfInterval({ start: validStartDate, end: validEndDate })
    
    // Revenue trend data
    const revenueTrend = dayInterval.map(date => {
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)
      
      const dayTransactions = creditTransactions.filter(t => 
        t.createdAt >= dayStart && t.createdAt <= dayEnd &&
        t.type === 'PURCHASE' && t.user.role === 'CUSTOMER'
      )
      
      const revenue = dayTransactions.reduce((sum, t) => sum + (t.amount * 25), 0) // R25 per credit
      
      return {
        date: format(date, 'MMM dd'),
        revenue,
        transactions: dayTransactions.length,
        credits: dayTransactions.reduce((sum, t) => sum + t.amount, 0)
      }
    })

    // Bookings trend data
    const bookingsTrend = dayInterval.map(date => {
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)
      
      const dayBookings = bookings.filter(b => 
        b.createdAt >= dayStart && b.createdAt <= dayEnd
      )
      
      return {
        date: format(date, 'MMM dd'),
        bookings: dayBookings.length,
        confirmed: dayBookings.filter(b => b.status === 'CONFIRMED').length,
        cancelled: dayBookings.filter(b => b.status === 'CANCELLED').length
      }
    })

    // User growth data
    let cumulativeUsers = 0
    const userGrowth = dayInterval.map(date => {
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)
      
      const dayUsers = users.filter(u => 
        u.createdAt >= dayStart && u.createdAt <= dayEnd
      )
      
      cumulativeUsers += dayUsers.length
      
      return {
        date: format(date, 'MMM dd'),
        newUsers: dayUsers.length,
        totalUsers: cumulativeUsers,
        activeUsers: dayUsers.filter(u => u._count.bookings > 0).length
      }
    })

    // Trip utilization data
    const tripUtilization = trips.map(trip => ({
      destination: trip.destination.name,
      maxPassengers: trip.maxPassengers,
      bookings: trip._count.bookings,
      utilization: Math.round((trip._count.bookings / trip.maxPassengers) * 100),
      revenue: trip._count.bookings * 25, // Assuming 1 credit per booking = R25
      date: format(trip.startTime, 'MMM dd')
    }))

    // Location analytics
    const locationAnalytics = locations.map(location => ({
      name: location.name,
      category: location.category,
      totalTrips: location._count.tripsAsDestination,
      totalBookings: location._count.bookingsAsPickup,
      popularity: location._count.tripsAsDestination + location._count.bookingsAsPickup
    })).sort((a, b) => b.popularity - a.popularity).slice(0, 10)

    // Financial summary
    const totalRevenue = creditTransactions
      .filter(t => t.type === 'PURCHASE' && t.user.role === 'CUSTOMER')
      .reduce((sum, t) => sum + (t.amount * 25), 0)

    const totalCreditsIssued = creditTransactions
      .filter(t => ['PURCHASE', 'ADMIN_ADJUSTMENT'].includes(t.type) && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0)

    const totalCreditsUsed = creditTransactions
      .filter(t => t.type === 'USAGE')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const financial = {
      totalRevenue,
      totalCreditsIssued,
      totalCreditsUsed,
      creditValue: 25,
      averageRevenuePerDay: totalRevenue / Math.max(1, dayInterval.length),
      creditFlow: {
        purchased: creditTransactions
          .filter(t => t.type === 'PURCHASE' && t.user.role === 'CUSTOMER')
          .reduce((sum, t) => sum + (t.amount * 25), 0),
        used: totalCreditsUsed,
        balance: totalCreditsIssued - totalCreditsUsed
      }
    }

    // Operational metrics
    const operational = {
      totalTrips: trips.length,
      completedTrips: trips.filter(t => t.status === 'COMPLETED').length,
      cancelledTrips: trips.filter(t => t.status === 'CANCELLED').length,
      totalBookings: bookings.length,
      confirmedBookings: bookings.filter(b => b.status === 'CONFIRMED').length,
      averageUtilization: trips.length > 0 
        ? Math.round(trips.reduce((sum, t) => sum + ((t._count.bookings / t.maxPassengers) * 100), 0) / trips.length)
        : 0,
      peakDestinations: locationAnalytics.slice(0, 5),
      newUsers: users.length
    }

    // Analytics and insights
    const analytics = {
      keyInsights: [
        {
          title: 'Revenue Growth',
          description: totalRevenue > 0 
            ? `Generated R${totalRevenue.toLocaleString()} in revenue over ${dayInterval.length} days`
            : 'No revenue generated in this period'
        },
        {
          title: 'User Engagement',
          description: `${users.filter(u => u._count.bookings > 0).length} out of ${users.length} new users made bookings`
        },
        {
          title: 'Trip Efficiency',
          description: operational.averageUtilization > 0 
            ? `Average trip utilization is ${operational.averageUtilization}%`
            : 'No trip utilization data available'
        },
        {
          title: 'Popular Destinations',
          description: locationAnalytics.length > 0 
            ? `${locationAnalytics[0].name} is the most popular destination`
            : 'No destination data available'
        }
      ],
      kpis: {
        revenuePerUser: users.length > 0 ? Math.round(totalRevenue / users.length) : 0,
        bookingsPerTrip: trips.length > 0 ? Math.round(bookings.length / trips.length * 10) / 10 : 0,
        creditUtilizationRate: totalCreditsIssued > 0 ? Math.round((totalCreditsUsed / totalCreditsIssued) * 100) : 0,
        avgRevenuePerDay: Math.round(financial.averageRevenuePerDay),
        userRetentionRate: users.length > 0 ? Math.round((users.filter(u => u._count.bookings > 1).length / users.length) * 100) : 0
      }
    }

    const reportData = {
      dateRange: {
        start: validStartDate,
        end: validEndDate,
        days: differenceInDays(validEndDate, validStartDate) + 1
      },
      revenueTrend,
      bookingsTrend,
      userGrowth,
      tripUtilization,
      locationAnalytics,
      financial,
      operational,
      analytics
    }

    return NextResponse.json(reportData)
  } catch (error) {
    console.error('Error fetching report data:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}