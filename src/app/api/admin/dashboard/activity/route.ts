import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { prisma } from '@/lib/prisma'
import { subHours } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const last24Hours = subHours(new Date(), 24)

    // Get recent activities from different tables
    const [recentBookings, recentTrips, recentUsers, recentCredits] = await Promise.all([
      // Recent bookings
      prisma.booking.findMany({
        where: {
          createdAt: {
            gte: last24Hours
          }
        },
        include: {
          user: {
            select: {
              name: true
            }
          },
          trip: {
            include: {
              destination: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      }),

      // Recent trips
      prisma.trip.findMany({
        where: {
          createdAt: {
            gte: last24Hours
          }
        },
        include: {
          destination: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      }),

      // Recent users
      prisma.user.findMany({
        where: {
          createdAt: {
            gte: last24Hours
          },
          role: 'CUSTOMER'
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      }),

      // Recent credit transactions
      prisma.creditTransaction.findMany({
        where: {
          createdAt: {
            gte: last24Hours
          }
        },
        include: {
          user: {
            select: {
              name: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5
      })
    ])

    // Transform data into unified activity format
    const activities = []

    // Add booking activities
    recentBookings.forEach(booking => {
      activities.push({
        id: `booking-${booking.id}`,
        type: 'booking' as const,
        description: `${booking.user.name} booked a trip to ${booking.trip.destination.name}`,
        timestamp: booking.createdAt.toISOString(),
        user: booking.user.name
      })
    })

    // Add trip activities
    recentTrips.forEach(trip => {
      activities.push({
        id: `trip-${trip.id}`,
        type: 'trip' as const,
        description: `New trip created to ${trip.destination.name}`,
        timestamp: trip.createdAt.toISOString()
      })
    })

    // Add user activities
    recentUsers.forEach(user => {
      activities.push({
        id: `user-${user.id}`,
        type: 'user' as const,
        description: `New user registered: ${user.name}`,
        timestamp: user.createdAt.toISOString(),
        user: user.name || 'Unknown'
      })
    })

    // Add credit activities
    recentCredits.forEach(credit => {
      const actionText = credit.type === 'PURCHASE' ? 'purchased' : 
                        credit.type === 'USAGE' ? 'used' : 
                        credit.type === 'REFUND' ? 'refunded' : 'adjusted'
      
      activities.push({
        id: `credit-${credit.id}`,
        type: 'credit' as const,
        description: `${credit.user.name} ${actionText} ${credit.amount} credits`,
        timestamp: credit.createdAt.toISOString(),
        user: credit.user.name
      })
    })

    // Sort all activities by timestamp (most recent first) and take top 10
    const sortedActivities = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)

    return NextResponse.json(sortedActivities)
  } catch (error) {
    console.error('Error fetching dashboard activity:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}