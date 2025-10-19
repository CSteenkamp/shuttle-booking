/**
 * Driver Performance Metrics
 * Calculates KPIs for driver performance tracking
 */

import { prisma } from '@/lib/prisma'
import { AssignmentStatus, BadgeType } from '@prisma/client'

export interface PerformanceMetrics {
  // Core metrics
  acceptanceRate: number          // % of assignments accepted
  completionRate: number          // % of accepted trips completed
  onTimeRate: number              // % of trips started on time
  averageResponseTime: number     // Average minutes to accept/decline

  // Volume metrics
  totalAssignments: number
  totalAccepted: number
  totalCompleted: number
  totalDeclined: number
  totalCancelled: number

  // Quality metrics
  averageRating: number
  totalRatings: number
  ratingDistribution: Record<number, number>

  // Streak metrics
  currentStreak: number           // Consecutive days active
  longestStreak: number

  // Financial metrics
  totalEarnings: number
  averageEarningPerTrip: number

  // Recent performance (last 30 days)
  recentAcceptanceRate: number
  recentCompletionRate: number
  recentTripsCount: number
}

export interface DriverBadgeData {
  id: string
  type: BadgeType
  name: string
  description: string
  icon: string
  earnedAt: Date
  level?: number
}

export interface PerformanceInsights {
  strengths: string[]
  improvementAreas: string[]
  nextMilestone?: {
    type: string
    current: number
    target: number
    progress: number
  }
}

/**
 * Calculate comprehensive performance metrics for a driver
 */
export async function calculateDriverMetrics(driverId: string): Promise<PerformanceMetrics> {
  // Get all trip assignments
  const allAssignments = await prisma.tripAssignment.findMany({
    where: { driverId },
    include: {
      trip: {
        include: {
          booking: true
        }
      }
    },
    orderBy: { assignedAt: 'desc' }
  })

  // Get driver profile for rating and earnings
  const driver = await prisma.driverProfile.findUnique({
    where: { id: driverId },
    include: {
      ratingsReceived: {
        orderBy: { createdAt: 'desc' }
      },
      earnings: {
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!driver) {
    throw new Error('Driver not found')
  }

  // Calculate assignment metrics
  const totalAssignments = allAssignments.length
  const accepted = allAssignments.filter(a =>
    a.status === AssignmentStatus.ACCEPTED ||
    a.status === AssignmentStatus.IN_PROGRESS ||
    a.status === AssignmentStatus.COMPLETED
  )
  const totalAccepted = accepted.length
  const totalCompleted = allAssignments.filter(a => a.status === AssignmentStatus.COMPLETED).length
  const totalDeclined = allAssignments.filter(a => a.status === AssignmentStatus.DECLINED).length
  const totalCancelled = allAssignments.filter(a => a.status === AssignmentStatus.CANCELLED).length

  // Calculate rates
  const acceptanceRate = totalAssignments > 0
    ? Math.round((totalAccepted / totalAssignments) * 100)
    : 0

  const completionRate = totalAccepted > 0
    ? Math.round((totalCompleted / totalAccepted) * 100)
    : 0

  // Calculate on-time rate (started within 5 minutes of scheduled time)
  const completedAssignments = allAssignments.filter(a => a.status === AssignmentStatus.COMPLETED)
  let onTimeCount = 0

  for (const assignment of completedAssignments) {
    if (assignment.acceptedAt && assignment.trip.booking.pickupTime) {
      const scheduledTime = new Date(assignment.trip.booking.pickupTime)
      const startedTime = new Date(assignment.acceptedAt)
      const diffMinutes = Math.abs(startedTime.getTime() - scheduledTime.getTime()) / 1000 / 60

      if (diffMinutes <= 5) {
        onTimeCount++
      }
    }
  }

  const onTimeRate = completedAssignments.length > 0
    ? Math.round((onTimeCount / completedAssignments.length) * 100)
    : 0

  // Calculate average response time (time from assignment to acceptance/decline)
  const responseTimes: number[] = []

  for (const assignment of allAssignments) {
    if (assignment.status === AssignmentStatus.ASSIGNED || assignment.status === AssignmentStatus.EXPIRED) {
      continue // Skip unresponded assignments
    }

    const responseTime = assignment.acceptedAt || assignment.declinedAt
    if (responseTime) {
      const diffMinutes = (responseTime.getTime() - assignment.assignedAt.getTime()) / 1000 / 60
      responseTimes.push(diffMinutes)
    }
  }

  const averageResponseTime = responseTimes.length > 0
    ? Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length)
    : 0

  // Rating metrics
  const ratings = driver.ratingsReceived
  const totalRatings = ratings.length
  const averageRating = driver.rating || 0

  const ratingDistribution: Record<number, number> = {
    5: 0, 4: 0, 3: 0, 2: 0, 1: 0
  }

  ratings.forEach(rating => {
    if (rating.stars >= 1 && rating.stars <= 5) {
      ratingDistribution[rating.stars]++
    }
  })

  // Calculate streak (consecutive days with at least one completed trip)
  const currentStreak = await calculateActiveStreak(driverId)
  const longestStreak = await calculateLongestStreak(driverId)

  // Financial metrics
  const earnings = driver.earnings
  const totalEarnings = earnings.reduce((sum, e) => sum + e.netAmount, 0)
  const averageEarningPerTrip = totalCompleted > 0
    ? Math.round(totalEarnings / totalCompleted)
    : 0

  // Recent performance (last 30 days)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentAssignments = allAssignments.filter(a => a.assignedAt >= thirtyDaysAgo)
  const recentAccepted = recentAssignments.filter(a =>
    a.status === AssignmentStatus.ACCEPTED ||
    a.status === AssignmentStatus.IN_PROGRESS ||
    a.status === AssignmentStatus.COMPLETED
  )
  const recentCompleted = recentAssignments.filter(a => a.status === AssignmentStatus.COMPLETED)

  const recentAcceptanceRate = recentAssignments.length > 0
    ? Math.round((recentAccepted.length / recentAssignments.length) * 100)
    : 0

  const recentCompletionRate = recentAccepted.length > 0
    ? Math.round((recentCompleted.length / recentAccepted.length) * 100)
    : 0

  return {
    acceptanceRate,
    completionRate,
    onTimeRate,
    averageResponseTime,
    totalAssignments,
    totalAccepted,
    totalCompleted,
    totalDeclined,
    totalCancelled,
    averageRating,
    totalRatings,
    ratingDistribution,
    currentStreak,
    longestStreak,
    totalEarnings,
    averageEarningPerTrip,
    recentAcceptanceRate,
    recentCompletionRate,
    recentTripsCount: recentCompleted.length
  }
}

/**
 * Calculate current active streak (consecutive days with completed trips)
 */
async function calculateActiveStreak(driverId: string): Promise<number> {
  const completedTrips = await prisma.tripAssignment.findMany({
    where: {
      driverId,
      status: AssignmentStatus.COMPLETED,
      completedAt: {
        not: null
      }
    },
    select: {
      completedAt: true
    },
    orderBy: {
      completedAt: 'desc'
    }
  })

  if (completedTrips.length === 0) {
    return 0
  }

  // Group trips by date
  const dateSet = new Set<string>()
  completedTrips.forEach(trip => {
    if (trip.completedAt) {
      const dateStr = trip.completedAt.toISOString().split('T')[0]
      dateSet.add(dateStr)
    }
  })

  const sortedDates = Array.from(dateSet).sort().reverse()

  // Calculate streak from most recent date
  let streak = 0
  let currentDate = new Date()
  currentDate.setHours(0, 0, 0, 0)

  for (const dateStr of sortedDates) {
    const tripDate = new Date(dateStr)
    tripDate.setHours(0, 0, 0, 0)

    const daysDiff = Math.floor((currentDate.getTime() - tripDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff === streak) {
      streak++
    } else if (daysDiff > streak) {
      // Gap in streak
      break
    }
  }

  return streak
}

/**
 * Calculate longest streak ever achieved
 */
async function calculateLongestStreak(driverId: string): Promise<number> {
  const completedTrips = await prisma.tripAssignment.findMany({
    where: {
      driverId,
      status: AssignmentStatus.COMPLETED,
      completedAt: {
        not: null
      }
    },
    select: {
      completedAt: true
    },
    orderBy: {
      completedAt: 'asc'
    }
  })

  if (completedTrips.length === 0) {
    return 0
  }

  // Group trips by date
  const dateSet = new Set<string>()
  completedTrips.forEach(trip => {
    if (trip.completedAt) {
      const dateStr = trip.completedAt.toISOString().split('T')[0]
      dateSet.add(dateStr)
    }
  })

  const sortedDates = Array.from(dateSet).sort()

  let longestStreak = 1
  let currentStreak = 1

  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = new Date(sortedDates[i - 1])
    const currDate = new Date(sortedDates[i])

    const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24))

    if (daysDiff === 1) {
      // Consecutive day
      currentStreak++
      longestStreak = Math.max(longestStreak, currentStreak)
    } else {
      // Gap, reset streak
      currentStreak = 1
    }
  }

  return longestStreak
}

/**
 * Get driver badges
 */
export async function getDriverBadges(driverId: string): Promise<DriverBadgeData[]> {
  const badges = await prisma.driverBadge.findMany({
    where: { driverId },
    orderBy: { earnedAt: 'desc' }
  })

  return badges.map(badge => ({
    id: badge.id,
    type: badge.type,
    name: badge.name,
    description: badge.description,
    icon: badge.icon,
    earnedAt: badge.earnedAt,
    level: badge.level
  }))
}

/**
 * Check and award badges based on performance
 */
export async function checkAndAwardBadges(driverId: string): Promise<DriverBadgeData[]> {
  const metrics = await calculateDriverMetrics(driverId)
  const existingBadges = await getDriverBadges(driverId)
  const existingBadgeTypes = new Set(existingBadges.map(b => `${b.type}_${b.level || 0}`))

  const newBadges: DriverBadgeData[] = []

  // Trip milestone badges
  const tripMilestones = [
    { trips: 10, level: 1, name: 'Rookie Driver', description: 'Completed 10 trips', icon: '🚗' },
    { trips: 50, level: 2, name: 'Experienced Driver', description: 'Completed 50 trips', icon: '🚕' },
    { trips: 100, level: 3, name: 'Veteran Driver', description: 'Completed 100 trips', icon: '🏆' },
    { trips: 500, level: 4, name: 'Master Driver', description: 'Completed 500 trips', icon: '⭐' },
    { trips: 1000, level: 5, name: 'Legend Driver', description: 'Completed 1000 trips', icon: '👑' }
  ]

  for (const milestone of tripMilestones) {
    const badgeKey = `${BadgeType.TRIPS_MILESTONE}_${milestone.level}`
    if (metrics.totalCompleted >= milestone.trips && !existingBadgeTypes.has(badgeKey)) {
      const badge = await prisma.driverBadge.create({
        data: {
          driverId,
          type: BadgeType.TRIPS_MILESTONE,
          name: milestone.name,
          description: milestone.description,
          icon: milestone.icon,
          level: milestone.level
        }
      })
      newBadges.push({
        id: badge.id,
        type: badge.type,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        earnedAt: badge.earnedAt,
        level: badge.level
      })
    }
  }

  // Rating achievement badges
  const ratingMilestones = [
    { rating: 4.5, reviews: 20, name: 'Highly Rated', description: '4.5+ stars with 20+ reviews', icon: '⭐' },
    { rating: 4.7, reviews: 50, name: 'Top Rated', description: '4.7+ stars with 50+ reviews', icon: '🌟' },
    { rating: 4.9, reviews: 100, name: 'Elite Rated', description: '4.9+ stars with 100+ reviews', icon: '💎' }
  ]

  for (const milestone of ratingMilestones) {
    const badgeKey = `${BadgeType.RATING_ACHIEVEMENT}_${milestone.rating}`
    if (
      metrics.averageRating >= milestone.rating &&
      metrics.totalRatings >= milestone.reviews &&
      !existingBadgeTypes.has(badgeKey)
    ) {
      const badge = await prisma.driverBadge.create({
        data: {
          driverId,
          type: BadgeType.RATING_ACHIEVEMENT,
          name: milestone.name,
          description: milestone.description,
          icon: milestone.icon,
          level: Math.floor(milestone.rating * 10)
        }
      })
      newBadges.push({
        id: badge.id,
        type: badge.type,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        earnedAt: badge.earnedAt,
        level: badge.level
      })
    }
  }

  // Streak achievement badges
  const streakMilestones = [
    { days: 7, name: 'Week Warrior', description: '7 day streak', icon: '🔥' },
    { days: 14, name: 'Fortnight Fighter', description: '14 day streak', icon: '🔥🔥' },
    { days: 30, name: 'Month Master', description: '30 day streak', icon: '🔥🔥🔥' },
    { days: 60, name: 'Consistency King', description: '60 day streak', icon: '👑' }
  ]

  for (const milestone of streakMilestones) {
    const badgeKey = `${BadgeType.STREAK_ACHIEVEMENT}_${milestone.days}`
    if (metrics.longestStreak >= milestone.days && !existingBadgeTypes.has(badgeKey)) {
      const badge = await prisma.driverBadge.create({
        data: {
          driverId,
          type: BadgeType.STREAK_ACHIEVEMENT,
          name: milestone.name,
          description: milestone.description,
          icon: milestone.icon,
          level: milestone.days
        }
      })
      newBadges.push({
        id: badge.id,
        type: badge.type,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        earnedAt: badge.earnedAt,
        level: badge.level
      })
    }
  }

  // Earnings milestone badges
  const earningsMilestones = [
    { amount: 10000, name: 'First 10K', description: 'Earned R10,000', icon: '💰' },
    { amount: 50000, name: 'High Earner', description: 'Earned R50,000', icon: '💵' },
    { amount: 100000, name: 'Top Earner', description: 'Earned R100,000', icon: '💸' },
    { amount: 500000, name: 'Elite Earner', description: 'Earned R500,000', icon: '🤑' }
  ]

  for (const milestone of earningsMilestones) {
    const badgeKey = `${BadgeType.EARNINGS_MILESTONE}_${milestone.amount}`
    if (metrics.totalEarnings >= milestone.amount && !existingBadgeTypes.has(badgeKey)) {
      const badge = await prisma.driverBadge.create({
        data: {
          driverId,
          type: BadgeType.EARNINGS_MILESTONE,
          name: milestone.name,
          description: milestone.description,
          icon: milestone.icon,
          level: milestone.amount
        }
      })
      newBadges.push({
        id: badge.id,
        type: badge.type,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        earnedAt: badge.earnedAt,
        level: badge.level
      })
    }
  }

  return newBadges
}

/**
 * Generate performance insights and recommendations
 */
export async function getPerformanceInsights(driverId: string): Promise<PerformanceInsights> {
  const metrics = await calculateDriverMetrics(driverId)

  const strengths: string[] = []
  const improvementAreas: string[] = []

  // Analyze acceptance rate
  if (metrics.acceptanceRate >= 90) {
    strengths.push(`Excellent acceptance rate (${metrics.acceptanceRate}%)`)
  } else if (metrics.acceptanceRate < 70) {
    improvementAreas.push(`Low acceptance rate (${metrics.acceptanceRate}%). Try accepting more trips to increase earnings.`)
  }

  // Analyze completion rate
  if (metrics.completionRate >= 95) {
    strengths.push(`Outstanding completion rate (${metrics.completionRate}%)`)
  } else if (metrics.completionRate < 85) {
    improvementAreas.push(`Completion rate could be improved (${metrics.completionRate}%). Avoid cancelling trips when possible.`)
  }

  // Analyze on-time performance
  if (metrics.onTimeRate >= 90) {
    strengths.push(`Great punctuality (${metrics.onTimeRate}% on-time)`)
  } else if (metrics.onTimeRate < 75) {
    improvementAreas.push(`On-time rate needs improvement (${metrics.onTimeRate}%). Try to arrive at pickups on schedule.`)
  }

  // Analyze ratings
  if (metrics.averageRating >= 4.7) {
    strengths.push(`Highly rated by customers (${metrics.averageRating.toFixed(1)}⭐)`)
  } else if (metrics.averageRating < 4.0 && metrics.totalRatings > 5) {
    improvementAreas.push(`Customer ratings could be higher (${metrics.averageRating.toFixed(1)}⭐). Focus on service quality.`)
  }

  // Analyze response time
  if (metrics.averageResponseTime <= 2) {
    strengths.push(`Very quick to respond (${metrics.averageResponseTime} min average)`)
  } else if (metrics.averageResponseTime > 5) {
    improvementAreas.push(`Response time is slow (${metrics.averageResponseTime} min). Respond to assignments faster.`)
  }

  // Analyze streak
  if (metrics.currentStreak >= 7) {
    strengths.push(`Consistent activity (${metrics.currentStreak} day streak)`)
  } else if (metrics.currentStreak === 0) {
    improvementAreas.push('No active streak. Complete trips daily to build consistency.')
  }

  // Calculate next milestone
  let nextMilestone: PerformanceInsights['nextMilestone'] = undefined

  const tripMilestones = [10, 50, 100, 500, 1000]
  for (const milestone of tripMilestones) {
    if (metrics.totalCompleted < milestone) {
      nextMilestone = {
        type: 'trips',
        current: metrics.totalCompleted,
        target: milestone,
        progress: Math.round((metrics.totalCompleted / milestone) * 100)
      }
      break
    }
  }

  return {
    strengths,
    improvementAreas,
    nextMilestone
  }
}

/**
 * Get leaderboard for a city or area
 */
export interface LeaderboardEntry {
  rank: number
  driverId: string
  driverName: string
  value: number
  badge?: string
}

export async function getCityLeaderboard(
  cityId: string,
  metric: 'trips' | 'rating' | 'earnings',
  limit: number = 10
): Promise<LeaderboardEntry[]> {
  const drivers = await prisma.driverProfile.findMany({
    where: {
      cityId,
      status: 'APPROVED'
    },
    include: {
      user: {
        select: {
          name: true
        }
      },
      earnings: true
    },
    take: 100 // Get more for sorting
  })

  // Sort based on metric
  let sorted: typeof drivers = []

  switch (metric) {
    case 'trips':
      sorted = drivers.sort((a, b) => b.completedTrips - a.completedTrips)
      break
    case 'rating':
      sorted = drivers
        .filter(d => d.totalRatings >= 5) // Minimum 5 ratings to appear
        .sort((a, b) => b.rating - a.rating)
      break
    case 'earnings':
      sorted = drivers.sort((a, b) => {
        const aEarnings = a.earnings.reduce((sum, e) => sum + e.netAmount, 0)
        const bEarnings = b.earnings.reduce((sum, e) => sum + e.netAmount, 0)
        return bEarnings - aEarnings
      })
      break
  }

  // Take top N
  const topDrivers = sorted.slice(0, limit)

  return topDrivers.map((driver, index) => {
    let value = 0
    let badge = undefined

    switch (metric) {
      case 'trips':
        value = driver.completedTrips
        if (index === 0) badge = '🥇'
        else if (index === 1) badge = '🥈'
        else if (index === 2) badge = '🥉'
        break
      case 'rating':
        value = Math.round(driver.rating * 10) / 10
        if (index === 0) badge = '⭐'
        break
      case 'earnings':
        value = driver.earnings.reduce((sum, e) => sum + e.netAmount, 0)
        if (index === 0) badge = '💰'
        break
    }

    return {
      rank: index + 1,
      driverId: driver.id,
      driverName: driver.user.name || 'Driver',
      value,
      badge
    }
  })
}
