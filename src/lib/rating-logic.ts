/**
 * Rating Logic Library
 * Handles rating calculations and aggregations
 */

import { prisma } from './prisma'
import { RatingRole } from '@prisma/client'

export interface SubmitRatingParams {
  bookingId: string
  tripId: string
  raterId: string
  ratedUserId: string
  ratedDriverId?: string
  role: RatingRole
  stars: number
  comment?: string
  tags?: string[]
}

/**
 * Submit a rating
 */
export async function submitRating(params: SubmitRatingParams) {
  const {
    bookingId,
    tripId,
    raterId,
    ratedUserId,
    ratedDriverId,
    role,
    stars,
    comment,
    tags
  } = params

  // Validate stars (1-5)
  if (stars < 1 || stars > 5) {
    throw new Error('Stars must be between 1 and 5')
  }

  // Check if rating already exists
  const existingRating = await prisma.rating.findFirst({
    where: {
      bookingId,
      raterId,
      role
    }
  })

  if (existingRating) {
    throw new Error('You have already rated this trip')
  }

  // Create rating
  const rating = await prisma.rating.create({
    data: {
      bookingId,
      tripId,
      raterId,
      ratedUserId,
      ratedDriverId,
      role,
      stars,
      comment,
      tags: tags || []
    }
  })

  // Update driver's average rating if this is a customer rating a driver
  if (role === RatingRole.CUSTOMER_RATING_DRIVER && ratedDriverId) {
    await updateDriverAverageRating(ratedDriverId)
  }

  return rating
}

/**
 * Update driver's average rating
 */
export async function updateDriverAverageRating(driverId: string) {
  // Calculate average from all customer ratings
  const ratings = await prisma.rating.findMany({
    where: {
      ratedDriverId: driverId,
      role: RatingRole.CUSTOMER_RATING_DRIVER
    },
    select: {
      stars: true
    }
  })

  if (ratings.length === 0) {
    return
  }

  const totalStars = ratings.reduce((sum, r) => sum + r.stars, 0)
  const averageRating = totalStars / ratings.length

  // Update driver profile
  await prisma.driverProfile.update({
    where: { id: driverId },
    data: {
      averageRating: Math.round(averageRating * 100) / 100 // Round to 2 decimals
    }
  })

  return averageRating
}

/**
 * Get driver ratings with statistics
 */
export async function getDriverRatings(driverId: string) {
  const ratings = await prisma.rating.findMany({
    where: {
      ratedDriverId: driverId,
      role: RatingRole.CUSTOMER_RATING_DRIVER
    },
    include: {
      trip: {
        select: {
          id: true,
          startTime: true,
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
    }
  })

  // Calculate statistics
  const totalRatings = ratings.length
  const averageRating = totalRatings > 0
    ? ratings.reduce((sum, r) => sum + r.stars, 0) / totalRatings
    : 0

  // Star distribution
  const starDistribution = {
    5: ratings.filter(r => r.stars === 5).length,
    4: ratings.filter(r => r.stars === 4).length,
    3: ratings.filter(r => r.stars === 3).length,
    2: ratings.filter(r => r.stars === 2).length,
    1: ratings.filter(r => r.stars === 1).length
  }

  // Tag frequency
  const tagFrequency: Record<string, number> = {}
  ratings.forEach(r => {
    r.tags.forEach(tag => {
      tagFrequency[tag] = (tagFrequency[tag] || 0) + 1
    })
  })

  // Top tags
  const topTags = Object.entries(tagFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag, count]) => ({ tag, count }))

  return {
    ratings,
    statistics: {
      total: totalRatings,
      average: Math.round(averageRating * 100) / 100,
      starDistribution,
      topTags
    }
  }
}

/**
 * Get ratings given by a user
 */
export async function getUserRatings(userId: string, role?: RatingRole) {
  const where: any = { raterId: userId }
  if (role) {
    where.role = role
  }

  const ratings = await prisma.rating.findMany({
    where,
    include: {
      trip: {
        select: {
          id: true,
          startTime: true,
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
    }
  })

  return ratings
}

/**
 * Check if user can rate a booking
 */
export async function canRateBooking(
  bookingId: string,
  userId: string,
  role: RatingRole
): Promise<{ canRate: boolean; reason?: string }> {
  // Check if booking exists and is completed
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      trip: {
        include: {
          assignments: true
        }
      }
    }
  })

  if (!booking) {
    return { canRate: false, reason: 'Booking not found' }
  }

  if (booking.status !== 'COMPLETED') {
    return { canRate: false, reason: 'Trip must be completed before rating' }
  }

  // Check authorization
  if (role === RatingRole.CUSTOMER_RATING_DRIVER) {
    // Customer rating driver
    if (booking.userId !== userId) {
      return { canRate: false, reason: 'You can only rate your own bookings' }
    }

    // Check if trip has a driver
    const assignment = booking.trip.assignments.find(a => a.status === 'COMPLETED')
    if (!assignment) {
      return { canRate: false, reason: 'No driver assigned to this trip' }
    }
  } else if (role === RatingRole.DRIVER_RATING_CUSTOMER) {
    // Driver rating customer
    const assignment = booking.trip.assignments.find(a => a.status === 'COMPLETED')
    if (!assignment) {
      return { canRate: false, reason: 'Trip not completed' }
    }

    // Check if user is the assigned driver
    const driver = await prisma.driverProfile.findFirst({
      where: {
        id: assignment.driverId,
        userId: userId
      }
    })

    if (!driver) {
      return { canRate: false, reason: 'You can only rate trips you completed as a driver' }
    }
  }

  // Check if already rated
  const existingRating = await prisma.rating.findFirst({
    where: {
      bookingId,
      raterId: userId,
      role
    }
  })

  if (existingRating) {
    return { canRate: false, reason: 'You have already rated this trip' }
  }

  return { canRate: true }
}

/**
 * Report a rating
 */
export async function reportRating(
  ratingId: string,
  reporterId: string,
  reason: string
) {
  const rating = await prisma.rating.update({
    where: { id: ratingId },
    data: {
      isReported: true,
      reportReason: reason
    }
  })

  // TODO: Notify admins

  return rating
}

/**
 * Admin: Review a reported rating
 */
export async function reviewRating(
  ratingId: string,
  adminResponse: string,
  action: 'approve' | 'remove'
) {
  if (action === 'remove') {
    // Delete the rating and recalculate driver average
    const rating = await prisma.rating.findUnique({
      where: { id: ratingId }
    })

    if (rating) {
      await prisma.rating.delete({
        where: { id: ratingId }
      })

      // Recalculate driver average if applicable
      if (rating.ratedDriverId) {
        await updateDriverAverageRating(rating.ratedDriverId)
      }
    }
  } else {
    // Mark as reviewed
    await prisma.rating.update({
      where: { id: ratingId },
      data: {
        adminReviewed: true,
        adminResponse,
        isReported: false // Clear report flag
      }
    })
  }
}

/**
 * Predefined rating tags
 */
export const RATING_TAGS = {
  CUSTOMER_RATING_DRIVER: [
    'Punctual',
    'Friendly',
    'Professional',
    'Clean Vehicle',
    'Safe Driver',
    'Good Communication',
    'Helpful',
    'Courteous',
    'Smooth Ride',
    'Great Service'
  ],
  DRIVER_RATING_CUSTOMER: [
    'Punctual',
    'Respectful',
    'Friendly',
    'Good Communication',
    'Clean',
    'Polite',
    'Easy Pickup',
    'Would Drive Again'
  ]
}
