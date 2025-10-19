import { prisma } from '@/lib/prisma'
import { DriverStatus, AssignmentStatus } from '@prisma/client'
import { isDriverAvailableByCalendar } from '@/lib/calendar-integration'

/**
 * Driver Assignment Logic
 * Handles automatic driver assignment, availability checking, and reassignment
 */

export interface DriverAvailability {
  driverId: string
  driverName: string
  vehicleInfo: string
  isAvailable: boolean
  currentTrips: number
  maxTrips: number
  distance?: number
  score: number // Higher is better
}

export interface AssignmentResult {
  success: boolean
  assignmentId?: string
  driverId?: string
  driverName?: string
  vehicleInfo?: string
  message: string
  error?: string
}

/**
 * Find available drivers for a trip based on area, time, and capacity
 */
export async function findAvailableDrivers(params: {
  areaId: string
  cityId: string
  startTime: Date
  endTime: Date
  passengerCount?: number
}): Promise<DriverAvailability[]> {
  const { areaId, cityId, startTime, endTime, passengerCount = 1 } = params

  try {
    // Get all active drivers in the area
    const drivers = await prisma.driverProfile.findMany({
      where: {
        status: DriverStatus.ACTIVE,
        isAvailable: true,
        driverAreas: {
          some: {
            areaId: areaId
          }
        }
      },
      include: {
        user: {
          select: {
            name: true,
            phone: true,
            email: true
          }
        },
        driverAreas: {
          where: { areaId },
          include: {
            area: true
          }
        },
        tripAssignments: {
          where: {
            status: {
              in: [AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.IN_PROGRESS]
            },
            trip: {
              startTime: {
                lte: endTime
              },
              endTime: {
                gte: startTime
              }
            }
          },
          include: {
            trip: true
          }
        },
        calendar: true
      }
    })

    const availabilityList: DriverAvailability[] = []

    for (const driver of drivers) {
      // Check if driver has conflicting trips
      const hasConflict = driver.tripAssignments.length > 0

      // Check calendar availability if calendar is connected
      let hasCalendarConflict = false
      if (driver.calendar && driver.calendar.isActive) {
        try {
          const calendarAvailable = await isDriverAvailableByCalendar(
            driver.id,
            startTime,
            endTime
          )
          hasCalendarConflict = !calendarAvailable
        } catch (error) {
          console.warn(`Failed to check calendar availability for driver ${driver.id}:`, error)
          // Continue without calendar check if it fails
        }
      }

      // Check if driver is at capacity for the day
      const todayStart = new Date(startTime)
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date(startTime)
      todayEnd.setHours(23, 59, 59, 999)

      const todayTrips = await prisma.tripAssignment.count({
        where: {
          driverId: driver.id,
          status: {
            in: [AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.COMPLETED]
          },
          trip: {
            startTime: {
              gte: todayStart,
              lte: todayEnd
            }
          }
        }
      })

      const maxTrips = driver.maxTripsPerDay || 20
      const atCapacity = todayTrips >= maxTrips

      // Calculate availability score
      let score = 100

      // Penalize if has conflicts
      if (hasConflict) {
        score = 0 // Not available
      }

      // Penalize if has calendar conflict
      if (hasCalendarConflict) {
        score = 0 // Not available
      }

      // Penalize if near capacity
      if (atCapacity) {
        score = 0 // Not available
      } else {
        const capacityRatio = todayTrips / maxTrips
        score -= capacityRatio * 30 // Reduce score based on how busy they are
      }

      // Bonus for primary area
      const isPrimaryArea = driver.driverAreas.some(da => da.isPrimary && da.areaId === areaId)
      if (isPrimaryArea) {
        score += 20
      }

      // Bonus for high ratings
      if (driver.averageRating) {
        score += (driver.averageRating - 3) * 10 // Add up to 20 points for 5-star rating
      }

      // Bonus for completed trips (experience)
      const experienceBonus = Math.min(driver.completedTrips / 100, 10) // Up to 10 points
      score += experienceBonus

      const isAvailable = score > 0

      availabilityList.push({
        driverId: driver.id,
        driverName: driver.user.name || 'Unknown Driver',
        vehicleInfo: `${driver.vehicleMake} ${driver.vehicleModel} (${driver.vehicleColor}) - ${driver.vehiclePlate}`,
        isAvailable,
        currentTrips: todayTrips,
        maxTrips,
        score
      })
    }

    // Sort by score (highest first)
    return availabilityList.sort((a, b) => b.score - a.score)

  } catch (error) {
    console.error('Error finding available drivers:', error)
    return []
  }
}

/**
 * Automatically assign the best available driver to a trip
 */
export async function autoAssignDriver(params: {
  tripId: string
  areaId: string
  cityId: string
  startTime: Date
  endTime: Date
  assignedBy?: string
}): Promise<AssignmentResult> {
  const { tripId, areaId, cityId, startTime, endTime, assignedBy } = params

  try {
    // Find available drivers
    const availableDrivers = await findAvailableDrivers({
      areaId,
      cityId,
      startTime,
      endTime
    })

    // Filter to only available drivers
    const candidates = availableDrivers.filter(d => d.isAvailable)

    if (candidates.length === 0) {
      return {
        success: false,
        message: 'No available drivers found for this time slot',
        error: 'NO_DRIVERS_AVAILABLE'
      }
    }

    // Select the best driver (highest score)
    const bestDriver = candidates[0]

    // Create assignment
    const assignment = await prisma.tripAssignment.create({
      data: {
        tripId,
        driverId: bestDriver.driverId,
        status: AssignmentStatus.ASSIGNED,
        assignmentType: 'auto',
        assignedBy: assignedBy || null
      }
    })

    // Update trip bookings with driver info
    await prisma.booking.updateMany({
      where: { tripId },
      data: {
        assignedDriverId: bestDriver.driverId,
        driverName: bestDriver.driverName,
        vehicleInfo: bestDriver.vehicleInfo
      }
    })

    // Update driver stats
    await prisma.driverProfile.update({
      where: { id: bestDriver.driverId },
      data: {
        totalTrips: { increment: 1 }
      }
    })

    return {
      success: true,
      assignmentId: assignment.id,
      driverId: bestDriver.driverId,
      driverName: bestDriver.driverName,
      vehicleInfo: bestDriver.vehicleInfo,
      message: `Successfully assigned driver: ${bestDriver.driverName}`
    }

  } catch (error) {
    console.error('Error auto-assigning driver:', error)
    return {
      success: false,
      message: 'Failed to assign driver',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    }
  }
}

/**
 * Manually assign a specific driver to a trip
 */
export async function assignDriverManually(params: {
  tripId: string
  driverId: string
  assignedBy: string
  force?: boolean
}): Promise<AssignmentResult> {
  const { tripId, driverId, assignedBy, force = false } = params

  try {
    // Get trip details
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        destination: true
      }
    })

    if (!trip) {
      return {
        success: false,
        message: 'Trip not found',
        error: 'TRIP_NOT_FOUND'
      }
    }

    // Get driver details
    const driver = await prisma.driverProfile.findUnique({
      where: { id: driverId },
      include: {
        user: true
      }
    })

    if (!driver) {
      return {
        success: false,
        message: 'Driver not found',
        error: 'DRIVER_NOT_FOUND'
      }
    }

    // Check if driver is available (unless forced)
    if (!force) {
      const availability = await findAvailableDrivers({
        areaId: trip.areaId!,
        cityId: trip.cityId!,
        startTime: trip.startTime,
        endTime: trip.endTime
      })

      const driverAvailability = availability.find(d => d.driverId === driverId)

      if (!driverAvailability || !driverAvailability.isAvailable) {
        return {
          success: false,
          message: 'Driver is not available for this time slot',
          error: 'DRIVER_NOT_AVAILABLE'
        }
      }
    }

    // Check for existing assignment
    const existingAssignment = await prisma.tripAssignment.findFirst({
      where: {
        tripId,
        status: {
          in: [AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED]
        }
      }
    })

    if (existingAssignment) {
      // Cancel existing assignment
      await prisma.tripAssignment.update({
        where: { id: existingAssignment.id },
        data: {
          status: AssignmentStatus.CANCELLED,
          cancellationReason: 'Reassigned to different driver'
        }
      })
    }

    // Create new assignment
    const assignment = await prisma.tripAssignment.create({
      data: {
        tripId,
        driverId,
        status: AssignmentStatus.ASSIGNED,
        assignmentType: 'manual',
        assignedBy
      }
    })

    // Update bookings
    const vehicleInfo = `${driver.vehicleMake} ${driver.vehicleModel} (${driver.vehicleColor}) - ${driver.vehiclePlate}`

    await prisma.booking.updateMany({
      where: { tripId },
      data: {
        assignedDriverId: driverId,
        driverName: driver.user.name || 'Unknown',
        vehicleInfo
      }
    })

    // Update driver stats
    await prisma.driverProfile.update({
      where: { id: driverId },
      data: {
        totalTrips: { increment: 1 }
      }
    })

    return {
      success: true,
      assignmentId: assignment.id,
      driverId,
      driverName: driver.user.name || 'Unknown',
      vehicleInfo,
      message: `Successfully assigned driver: ${driver.user.name}`
    }

  } catch (error) {
    console.error('Error manually assigning driver:', error)
    return {
      success: false,
      message: 'Failed to assign driver',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    }
  }
}

/**
 * Reassign a trip if the current driver becomes unavailable
 */
export async function reassignTrip(params: {
  tripId: string
  reason: string
  reassignedBy: string
}): Promise<AssignmentResult> {
  const { tripId, reason, reassignedBy } = params

  try {
    // Get trip details
    const trip = await prisma.trip.findUnique({
      where: { id: tripId }
    })

    if (!trip) {
      return {
        success: false,
        message: 'Trip not found',
        error: 'TRIP_NOT_FOUND'
      }
    }

    // Cancel existing assignment
    await prisma.tripAssignment.updateMany({
      where: {
        tripId,
        status: {
          in: [AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED]
        }
      },
      data: {
        status: AssignmentStatus.CANCELLED,
        cancellationReason: reason
      }
    })

    // Auto-assign to new driver
    return await autoAssignDriver({
      tripId,
      areaId: trip.areaId!,
      cityId: trip.cityId!,
      startTime: trip.startTime,
      endTime: trip.endTime,
      assignedBy: reassignedBy
    })

  } catch (error) {
    console.error('Error reassigning trip:', error)
    return {
      success: false,
      message: 'Failed to reassign trip',
      error: error instanceof Error ? error.message : 'UNKNOWN_ERROR'
    }
  }
}

/**
 * Check if a driver is available for a specific time period
 */
export async function checkDriverAvailability(params: {
  driverId: string
  startTime: Date
  endTime: Date
}): Promise<boolean> {
  const { driverId, startTime, endTime } = params

  try {
    const driver = await prisma.driverProfile.findUnique({
      where: { id: driverId },
      include: {
        tripAssignments: {
          where: {
            status: {
              in: [AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.IN_PROGRESS]
            },
            trip: {
              startTime: {
                lte: endTime
              },
              endTime: {
                gte: startTime
              }
            }
          }
        },
        calendar: true
      }
    })

    if (!driver || !driver.isAvailable) {
      return false
    }

    // Check for conflicting trips
    if (driver.tripAssignments.length > 0) {
      return false
    }

    // Check calendar availability if connected
    if (driver.calendar && driver.calendar.isActive) {
      try {
        const calendarAvailable = await isDriverAvailableByCalendar(
          driverId,
          startTime,
          endTime
        )
        if (!calendarAvailable) {
          return false
        }
      } catch (error) {
        console.warn(`Failed to check calendar availability for driver ${driverId}:`, error)
        // Continue without calendar check if it fails
      }
    }

    // Check daily capacity
    const todayStart = new Date(startTime)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(startTime)
    todayEnd.setHours(23, 59, 59, 999)

    const todayTrips = await prisma.tripAssignment.count({
      where: {
        driverId,
        status: {
          in: [AssignmentStatus.ASSIGNED, AssignmentStatus.ACCEPTED, AssignmentStatus.COMPLETED]
        },
        trip: {
          startTime: {
            gte: todayStart,
            lte: todayEnd
          }
        }
      }
    })

    const maxTrips = driver.maxTripsPerDay || 20

    return todayTrips < maxTrips

  } catch (error) {
    console.error('Error checking driver availability:', error)
    return false
  }
}
