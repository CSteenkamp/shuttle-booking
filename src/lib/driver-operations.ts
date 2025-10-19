/**
 * Driver Operations Library
 * Phase 2: Core logic for driver trip management
 *
 * Handles:
 * - Accept/decline assignments
 * - Start/complete trips
 * - Status transitions
 * - Trip status history tracking
 * - Notifications
 */

import { prisma } from './prisma'
import { AssignmentStatus } from '@prisma/client'
import { createNotification } from './notifications'

// ============================================================================
// TYPES
// ============================================================================

export interface TripAssignmentResponse {
  success: boolean
  assignment?: any
  message?: string
  error?: string
}

export interface TripStatusUpdate {
  success: boolean
  assignment?: any
  statusHistory?: any
  message?: string
  error?: string
}

// ============================================================================
// ASSIGNMENT RESPONSES
// ============================================================================

/**
 * Accept a trip assignment
 */
export async function acceptTripAssignment(
  assignmentId: string,
  driverId: string
): Promise<TripAssignmentResponse> {
  try {
    // Fetch assignment with trip details
    const assignment = await prisma.tripAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        trip: {
          include: {
            destination: true,
            bookings: {
              include: {
                user: true,
                rider: true
              }
            }
          }
        },
        driver: {
          include: {
            user: true
          }
        }
      }
    })

    if (!assignment) {
      return { success: false, error: 'Assignment not found' }
    }

    // Validate driver owns this assignment
    if (assignment.driverId !== driverId) {
      return { success: false, error: 'Unauthorized: Assignment belongs to different driver' }
    }

    // Check if already accepted/declined
    if (assignment.status !== AssignmentStatus.ASSIGNED) {
      return {
        success: false,
        error: `Cannot accept assignment with status: ${assignment.status}`
      }
    }

    // Update assignment status
    const updated = await prisma.tripAssignment.update({
      where: { id: assignmentId },
      data: {
        status: AssignmentStatus.ACCEPTED,
        acceptedAt: new Date()
      },
      include: {
        trip: {
          include: {
            destination: true,
            bookings: true
          }
        }
      }
    })

    // Record status change in history
    await prisma.tripStatusHistory.create({
      data: {
        tripId: assignment.tripId,
        assignmentId: assignmentId,
        fromStatus: AssignmentStatus.ASSIGNED,
        toStatus: AssignmentStatus.ACCEPTED,
        changedBy: driverId,
        note: 'Driver accepted the trip assignment'
      }
    })

    // Notify customers that driver accepted
    const bookings = assignment.trip.bookings
    for (const booking of bookings) {
      await createNotification({
        userId: booking.userId,
        title: 'Driver Accepted!',
        message: `${assignment.driver.user.name} has accepted your trip to ${assignment.trip.destination.name}`,
        type: 'TRIP_UPDATE',
        priority: 'MEDIUM',
        tripId: assignment.tripId,
        bookingId: booking.id
      })
    }

    return {
      success: true,
      assignment: updated,
      message: 'Trip accepted successfully'
    }
  } catch (error) {
    console.error('Error accepting trip assignment:', error)
    return {
      success: false,
      error: 'Failed to accept assignment'
    }
  }
}

/**
 * Decline a trip assignment
 */
export async function declineTripAssignment(
  assignmentId: string,
  driverId: string,
  reason?: string
): Promise<TripAssignmentResponse> {
  try {
    // Fetch assignment
    const assignment = await prisma.tripAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        trip: true,
        driver: {
          include: {
            user: true
          }
        }
      }
    })

    if (!assignment) {
      return { success: false, error: 'Assignment not found' }
    }

    // Validate driver owns this assignment
    if (assignment.driverId !== driverId) {
      return { success: false, error: 'Unauthorized: Assignment belongs to different driver' }
    }

    // Check if can be declined
    if (![AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED].includes(assignment.status)) {
      return {
        success: false,
        error: `Cannot decline assignment with status: ${assignment.status}`
      }
    }

    // Update assignment status
    const updated = await prisma.tripAssignment.update({
      where: { id: assignmentId },
      data: {
        status: AssignmentStatus.DECLINED,
        declinedAt: new Date(),
        declineReason: reason || 'No reason provided'
      }
    })

    // Record status change in history
    await prisma.tripStatusHistory.create({
      data: {
        tripId: assignment.tripId,
        assignmentId: assignmentId,
        fromStatus: assignment.status,
        toStatus: AssignmentStatus.DECLINED,
        changedBy: driverId,
        note: reason ? `Driver declined: ${reason}` : 'Driver declined the trip assignment'
      }
    })

    // TODO: Trigger reassignment logic here
    // This should find another available driver for the trip

    return {
      success: true,
      assignment: updated,
      message: 'Trip declined'
    }
  } catch (error) {
    console.error('Error declining trip assignment:', error)
    return {
      success: false,
      error: 'Failed to decline assignment'
    }
  }
}

// ============================================================================
// TRIP LIFECYCLE
// ============================================================================

/**
 * Mark trip as started (driver en route to pickup)
 */
export async function startTrip(
  assignmentId: string,
  driverId: string,
  location?: { lat: number; lng: number }
): Promise<TripStatusUpdate> {
  try {
    const assignment = await prisma.tripAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        trip: {
          include: {
            destination: true,
            bookings: {
              include: {
                user: true
              }
            }
          }
        }
      }
    })

    if (!assignment) {
      return { success: false, error: 'Assignment not found' }
    }

    if (assignment.driverId !== driverId) {
      return { success: false, error: 'Unauthorized' }
    }

    if (assignment.status !== AssignmentStatus.ACCEPTED) {
      return {
        success: false,
        error: `Cannot start trip with status: ${assignment.status}. Must be ACCEPTED first.`
      }
    }

    // Update assignment
    const updated = await prisma.tripAssignment.update({
      where: { id: assignmentId },
      data: {
        status: AssignmentStatus.IN_PROGRESS,
        startedAt: new Date()
      },
      include: {
        trip: {
          include: {
            destination: true
          }
        }
      }
    })

    // Update trip status
    await prisma.trip.update({
      where: { id: assignment.tripId },
      data: {
        status: 'IN_PROGRESS'
      }
    })

    // Record status change
    const statusHistory = await prisma.tripStatusHistory.create({
      data: {
        tripId: assignment.tripId,
        assignmentId: assignmentId,
        fromStatus: AssignmentStatus.ACCEPTED,
        toStatus: AssignmentStatus.IN_PROGRESS,
        changedBy: driverId,
        note: 'Driver started the trip',
        location: location ? { lat: location.lat, lng: location.lng } : undefined
      }
    })

    // Notify all passengers
    const bookings = assignment.trip.bookings
    for (const booking of bookings) {
      await createNotification({
        userId: booking.userId,
        title: 'Driver on the way!',
        message: `Your driver is on the way to pick you up`,
        type: 'TRIP_UPDATE',
        priority: 'HIGH',
        tripId: assignment.tripId,
        bookingId: booking.id
      })
    }

    return {
      success: true,
      assignment: updated,
      statusHistory,
      message: 'Trip started'
    }
  } catch (error) {
    console.error('Error starting trip:', error)
    return {
      success: false,
      error: 'Failed to start trip'
    }
  }
}

/**
 * Mark driver as arrived at pickup location
 */
export async function arriveAtPickup(
  assignmentId: string,
  driverId: string,
  location?: { lat: number; lng: number }
): Promise<TripStatusUpdate> {
  try {
    const assignment = await prisma.tripAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        trip: {
          include: {
            bookings: {
              include: {
                user: true
              }
            }
          }
        }
      }
    })

    if (!assignment) {
      return { success: false, error: 'Assignment not found' }
    }

    if (assignment.driverId !== driverId) {
      return { success: false, error: 'Unauthorized' }
    }

    if (assignment.status !== AssignmentStatus.IN_PROGRESS) {
      return {
        success: false,
        error: `Cannot mark arrival with status: ${assignment.status}`
      }
    }

    // Update assignment
    const updated = await prisma.tripAssignment.update({
      where: { id: assignmentId },
      data: {
        status: AssignmentStatus.ARRIVED,
        arrivedAt: new Date()
      }
    })

    // Record status change
    const statusHistory = await prisma.tripStatusHistory.create({
      data: {
        tripId: assignment.tripId,
        assignmentId: assignmentId,
        fromStatus: AssignmentStatus.IN_PROGRESS,
        toStatus: AssignmentStatus.ARRIVED,
        changedBy: driverId,
        note: 'Driver arrived at pickup location',
        location: location ? { lat: location.lat, lng: location.lng } : undefined
      }
    })

    // Notify all passengers
    const bookings = assignment.trip.bookings
    for (const booking of bookings) {
      await createNotification({
        userId: booking.userId,
        title: 'Driver has arrived!',
        message: `Your driver is here`,
        type: 'TRIP_UPDATE',
        priority: 'URGENT',
        tripId: assignment.tripId,
        bookingId: booking.id
      })
    }

    return {
      success: true,
      assignment: updated,
      statusHistory,
      message: 'Marked as arrived'
    }
  } catch (error) {
    console.error('Error marking arrival:', error)
    return {
      success: false,
      error: 'Failed to update arrival status'
    }
  }
}

/**
 * Complete a trip
 */
export async function completeTrip(
  assignmentId: string,
  driverId: string,
  options?: {
    distance?: number // km
    duration?: number // minutes
    location?: { lat: number; lng: number }
  }
): Promise<TripStatusUpdate> {
  try {
    const assignment = await prisma.tripAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        trip: {
          include: {
            destination: true,
            bookings: {
              include: {
                user: true
              }
            }
          }
        },
        driver: {
          include: {
            user: true
          }
        }
      }
    })

    if (!assignment) {
      return { success: false, error: 'Assignment not found' }
    }

    if (assignment.driverId !== driverId) {
      return { success: false, error: 'Unauthorized' }
    }

    if (![AssignmentStatus.IN_PROGRESS, AssignmentStatus.ARRIVED].includes(assignment.status)) {
      return {
        success: false,
        error: `Cannot complete trip with status: ${assignment.status}`
      }
    }

    // Update assignment
    const updated = await prisma.tripAssignment.update({
      where: { id: assignmentId },
      data: {
        status: AssignmentStatus.COMPLETED,
        completedAt: new Date()
      }
    })

    // Update trip status
    await prisma.trip.update({
      where: { id: assignment.tripId },
      data: {
        status: 'COMPLETED'
      }
    })

    // Update all bookings
    await prisma.booking.updateMany({
      where: { tripId: assignment.tripId },
      data: {
        status: 'COMPLETED'
      }
    })

    // Record status change
    const statusHistory = await prisma.tripStatusHistory.create({
      data: {
        tripId: assignment.tripId,
        assignmentId: assignmentId,
        fromStatus: assignment.status,
        toStatus: AssignmentStatus.COMPLETED,
        changedBy: driverId,
        note: 'Trip completed successfully',
        location: options?.location ? { lat: options.location.lat, lng: options.location.lng } : undefined
      }
    })

    // Calculate earnings for driver
    const bookings = assignment.trip.bookings
    const totalPassengers = bookings.reduce((sum, b) => sum + b.passengerCount, 0)
    const totalCredits = bookings.reduce((sum, b) => sum + b.creditsCost, 0)

    // Get driver rates or use defaults
    const baseAmount = totalCredits // For now, driver gets full credits
    const platformFeePercent = 15 // 15% platform fee
    const platformFee = Math.floor(baseAmount * (platformFeePercent / 100))
    const netAmount = baseAmount - platformFee

    // Create earnings record for each booking
    for (const booking of bookings) {
      const bookingCredits = booking.creditsCost
      const bookingPlatformFee = Math.floor(bookingCredits * (platformFeePercent / 100))
      const bookingNetAmount = bookingCredits - bookingPlatformFee

      await prisma.driverEarnings.create({
        data: {
          driverId: driverId,
          tripId: assignment.tripId,
          bookingId: booking.id,
          baseAmount: bookingCredits,
          distanceAmount: 0, // TODO: Calculate based on distance
          timeAmount: 0, // TODO: Calculate based on time
          totalAmount: bookingCredits,
          platformFee: bookingPlatformFee,
          netAmount: bookingNetAmount,
          payoutStatus: 'PENDING',
          tripDate: assignment.trip.startTime,
          passengerCount: booking.passengerCount,
          distance: options?.distance,
          duration: options?.duration
        }
      })
    }

    // Update driver stats
    await prisma.driverProfile.update({
      where: { id: driverId },
      data: {
        completedTrips: {
          increment: 1
        },
        totalTrips: {
          increment: 1
        },
        totalEarnings: {
          increment: netAmount
        }
      }
    })

    // Notify all passengers
    for (const booking of bookings) {
      await createNotification({
        userId: booking.userId,
        title: 'Trip Completed!',
        message: `Your trip to ${assignment.trip.destination.name} is complete. Please rate your driver.`,
        type: 'TRIP_UPDATE',
        priority: 'MEDIUM',
        tripId: assignment.tripId,
        bookingId: booking.id,
        actionUrl: `/bookings/${booking.id}/rate`
      })
    }

    return {
      success: true,
      assignment: updated,
      statusHistory,
      message: 'Trip completed successfully'
    }
  } catch (error) {
    console.error('Error completing trip:', error)
    return {
      success: false,
      error: 'Failed to complete trip'
    }
  }
}

/**
 * Cancel a trip (by driver)
 */
export async function cancelTrip(
  assignmentId: string,
  driverId: string,
  reason: string
): Promise<TripStatusUpdate> {
  try {
    const assignment = await prisma.tripAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        trip: {
          include: {
            bookings: {
              include: {
                user: true
              }
            }
          }
        }
      }
    })

    if (!assignment) {
      return { success: false, error: 'Assignment not found' }
    }

    if (assignment.driverId !== driverId) {
      return { success: false, error: 'Unauthorized' }
    }

    if (assignment.status === AssignmentStatus.COMPLETED || assignment.status === AssignmentStatus.CANCELLED) {
      return {
        success: false,
        error: `Cannot cancel trip with status: ${assignment.status}`
      }
    }

    // Update assignment
    const updated = await prisma.tripAssignment.update({
      where: { id: assignmentId },
      data: {
        status: AssignmentStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: reason
      }
    })

    // Record status change
    const statusHistory = await prisma.tripStatusHistory.create({
      data: {
        tripId: assignment.tripId,
        assignmentId: assignmentId,
        fromStatus: assignment.status,
        toStatus: AssignmentStatus.CANCELLED,
        changedBy: driverId,
        note: `Driver cancelled: ${reason}`
      }
    })

    // Update driver stats
    await prisma.driverProfile.update({
      where: { id: driverId },
      data: {
        cancelledTrips: {
          increment: 1
        },
        totalTrips: {
          increment: 1
        }
      }
    })

    // Notify all passengers
    const bookings = assignment.trip.bookings
    for (const booking of bookings) {
      await createNotification({
        userId: booking.userId,
        title: 'Trip Cancelled',
        message: `Your driver has cancelled the trip. We're finding you another driver.`,
        type: 'TRIP_UPDATE',
        priority: 'URGENT',
        tripId: assignment.tripId,
        bookingId: booking.id
      })
    }

    // TODO: Trigger reassignment logic

    return {
      success: true,
      assignment: updated,
      statusHistory,
      message: 'Trip cancelled'
    }
  } catch (error) {
    console.error('Error cancelling trip:', error)
    return {
      success: false,
      error: 'Failed to cancel trip'
    }
  }
}

// ============================================================================
// DRIVER STATUS MANAGEMENT
// ============================================================================

/**
 * Set driver online/offline status
 */
export async function setDriverOnlineStatus(
  driverId: string,
  isOnline: boolean
): Promise<{ success: boolean; driver?: any; error?: string }> {
  try {
    const driver = await prisma.driverProfile.update({
      where: { id: driverId },
      data: {
        isOnline,
        updatedAt: new Date()
      }
    })

    return {
      success: true,
      driver
    }
  } catch (error) {
    console.error('Error setting driver online status:', error)
    return {
      success: false,
      error: 'Failed to update online status'
    }
  }
}

/**
 * Get driver's assigned trips
 */
export async function getDriverTrips(
  driverId: string,
  options?: {
    status?: AssignmentStatus | AssignmentStatus[]
    includeCompleted?: boolean
    limit?: number
  }
) {
  try {
    const statuses = options?.status
      ? Array.isArray(options.status)
        ? options.status
        : [options.status]
      : options?.includeCompleted
      ? undefined // All statuses
      : [
          AssignmentStatus.ASSIGNED,
          AssignmentStatus.ACCEPTED,
          AssignmentStatus.IN_PROGRESS,
          AssignmentStatus.ARRIVED
        ]

    const assignments = await prisma.tripAssignment.findMany({
      where: {
        driverId,
        ...(statuses && { status: { in: statuses } })
      },
      include: {
        trip: {
          include: {
            destination: true,
            city: true,
            area: true,
            bookings: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    email: true
                  }
                },
                rider: true,
                pickupLocation: true,
                pickupSavedAddress: true
              }
            }
          }
        }
      },
      orderBy: [
        { trip: { startTime: 'asc' } }
      ],
      take: options?.limit
    })

    return assignments
  } catch (error) {
    console.error('Error fetching driver trips:', error)
    throw error
  }
}
