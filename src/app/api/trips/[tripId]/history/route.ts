/**
 * Trip Status History API
 * GET /api/trips/[tripId]/history
 * Returns the status history timeline for a trip
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: { tripId: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { tripId } = params

    // Fetch the trip to verify access
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        bookings: {
          where: {
            userId: session.user.id
          }
        },
        assignments: {
          include: {
            driver: {
              include: {
                user: true
              }
            }
          }
        }
      }
    })

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    // Check authorization
    const isCustomer = trip.bookings.length > 0
    const isDriver = trip.assignments.some(a => a.driver.userId === session.user.id)
    const isAdmin = session.user.role === 'ADMIN'

    if (!isCustomer && !isDriver && !isAdmin) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Fetch status history
    const history = await prisma.tripStatusHistory.findMany({
      where: { tripId },
      orderBy: {
        createdAt: 'asc'
      }
    })

    // Build timeline events
    const events = history.map(h => ({
      id: h.id,
      status: h.toStatus,
      previousStatus: h.fromStatus,
      timestamp: h.createdAt,
      label: getStatusLabel(h.toStatus),
      description: h.note || undefined,
      changedBy: h.changedBy,
      location: h.location as any
    }))

    // Add trip creation event if no history exists
    if (events.length === 0) {
      events.push({
        id: 'created',
        status: 'CREATED',
        previousStatus: null,
        timestamp: trip.createdAt,
        label: 'Trip Created',
        description: 'Trip was created in the system',
        changedBy: null,
        location: null
      })
    }

    // Get current assignment status if exists
    const currentAssignment = trip.assignments.length > 0
      ? trip.assignments[trip.assignments.length - 1]
      : null

    return NextResponse.json({
      success: true,
      trip: {
        id: trip.id,
        status: trip.status,
        startTime: trip.startTime,
        endTime: trip.endTime
      },
      currentStatus: currentAssignment?.status || trip.status,
      assignment: currentAssignment ? {
        id: currentAssignment.id,
        status: currentAssignment.status,
        driver: {
          id: currentAssignment.driver.id,
          name: currentAssignment.driver.user.name
        },
        acceptedAt: currentAssignment.acceptedAt,
        startedAt: currentAssignment.startedAt,
        arrivedAt: currentAssignment.arrivedAt,
        completedAt: currentAssignment.completedAt
      } : null,
      events,
      timeline: events
    })
  } catch (error) {
    console.error('Error fetching trip history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch trip history' },
      { status: 500 }
    )
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'ASSIGNED': return 'Driver Assigned'
    case 'ACCEPTED': return 'Driver Accepted'
    case 'IN_PROGRESS': return 'Trip Started'
    case 'ARRIVED': return 'Driver Arrived'
    case 'COMPLETED': return 'Trip Completed'
    case 'CANCELLED': return 'Trip Cancelled'
    case 'DECLINED': return 'Driver Declined'
    default: return status
  }
}
