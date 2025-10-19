/**
 * Push Notification System
 * Web Push API integration with VAPID
 */

import { prisma } from '@/lib/prisma'
import webpush from 'web-push'

// VAPID keys configuration
// Generate with: npx web-push generate-vapid-keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@tjoeftjaf.xyz'

// Configure web-push
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
}

export interface PushSubscriptionData {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: Record<string, any>
  tag?: string
  requireInteraction?: boolean
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

/**
 * Subscribe user to push notifications
 */
export async function subscribeToPush(
  userId: string,
  subscription: PushSubscriptionData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check if subscription already exists
    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint }
    })

    if (existing) {
      // Update if different user
      if (existing.userId !== userId) {
        await prisma.pushSubscription.update({
          where: { endpoint: subscription.endpoint },
          data: { userId }
        })
      }
      return { success: true }
    }

    // Create new subscription
    await prisma.pushSubscription.create({
      data: {
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      }
    })

    return { success: true }
  } catch (error) {
    console.error('Error subscribing to push:', error)
    return {
      success: false,
      error: 'Failed to subscribe to notifications'
    }
  }
}

/**
 * Unsubscribe user from push notifications
 */
export async function unsubscribeFromPush(
  endpoint: string
): Promise<{ success: boolean }> {
  try {
    await prisma.pushSubscription.delete({
      where: { endpoint }
    })
    return { success: true }
  } catch (error) {
    console.error('Error unsubscribing from push:', error)
    return { success: false }
  }
}

/**
 * Send push notification to a user
 */
export async function sendPushToUser(
  userId: string,
  payload: NotificationPayload
): Promise<{ success: boolean; sent: number; failed: number }> {
  try {
    // Get all subscriptions for user
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId }
    })

    if (subscriptions.length === 0) {
      return { success: true, sent: 0, failed: 0 }
    }

    let sent = 0
    let failed = 0

    // Send to all subscriptions
    const promises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }

        await webpush.sendNotification(
          pushSubscription,
          JSON.stringify(payload)
        )
        sent++
      } catch (error: any) {
        console.error('Error sending push to subscription:', error)
        failed++

        // Remove invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          await prisma.pushSubscription.delete({
            where: { id: sub.id }
          }).catch(() => {})
        }
      }
    })

    await Promise.all(promises)

    return { success: true, sent, failed }
  } catch (error) {
    console.error('Error sending push to user:', error)
    return { success: false, sent: 0, failed: 0 }
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: NotificationPayload
): Promise<{ success: boolean; sent: number; failed: number }> {
  let totalSent = 0
  let totalFailed = 0

  const promises = userIds.map(async (userId) => {
    const result = await sendPushToUser(userId, payload)
    totalSent += result.sent
    totalFailed += result.failed
  })

  await Promise.all(promises)

  return { success: true, sent: totalSent, failed: totalFailed }
}

/**
 * Notification templates for common scenarios
 */

export async function notifyTripAssigned(driverId: string, tripDetails: {
  bookingId: string
  pickupLocation: string
  dropoffLocation: string
  pickupTime: Date
  passengerName: string
  passengerCount: number
}) {
  const payload: NotificationPayload = {
    title: '🚗 New Trip Assignment',
    body: `${tripDetails.passengerName} needs a ride to ${tripDetails.dropoffLocation}`,
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: `trip-${tripDetails.bookingId}`,
    requireInteraction: true,
    data: {
      type: 'TRIP_ASSIGNED',
      bookingId: tripDetails.bookingId,
      url: '/driver/dashboard'
    },
    actions: [
      { action: 'view', title: 'View Trip', icon: '/icons/view.png' },
      { action: 'decline', title: 'Decline', icon: '/icons/decline.png' }
    ]
  }

  return await sendPushToUser(driverId, payload)
}

export async function notifyTripCancelled(driverId: string, tripDetails: {
  bookingId: string
  pickupLocation: string
  reason?: string
}) {
  const payload: NotificationPayload = {
    title: '❌ Trip Cancelled',
    body: `Trip from ${tripDetails.pickupLocation} has been cancelled`,
    icon: '/icon-192.png',
    data: {
      type: 'TRIP_CANCELLED',
      bookingId: tripDetails.bookingId,
      url: '/driver/dashboard'
    }
  }

  return await sendPushToUser(driverId, payload)
}

export async function notifyRatingReceived(driverId: string, ratingDetails: {
  stars: number
  comment?: string
  tripId: string
}) {
  const starsEmoji = '⭐'.repeat(ratingDetails.stars)

  const payload: NotificationPayload = {
    title: '⭐ New Rating Received',
    body: `You received ${starsEmoji} (${ratingDetails.stars}/5)${ratingDetails.comment ? `: "${ratingDetails.comment}"` : ''}`,
    icon: '/icon-192.png',
    data: {
      type: 'RATING_RECEIVED',
      tripId: ratingDetails.tripId,
      stars: ratingDetails.stars,
      url: '/driver/ratings'
    }
  }

  return await sendPushToUser(driverId, payload)
}

export async function notifyBadgeEarned(driverId: string, badgeDetails: {
  name: string
  description: string
  icon: string
}) {
  const payload: NotificationPayload = {
    title: '🏆 Badge Earned!',
    body: `Congratulations! You earned the "${badgeDetails.name}" badge`,
    icon: '/icon-192.png',
    data: {
      type: 'BADGE_EARNED',
      badgeName: badgeDetails.name,
      url: '/driver/performance'
    },
    requireInteraction: true
  }

  return await sendPushToUser(driverId, payload)
}

export async function notifyPayoutProcessed(driverId: string, payoutDetails: {
  amount: number
  period: string
}) {
  const payload: NotificationPayload = {
    title: '💰 Payout Processed',
    body: `Your payout of R${payoutDetails.amount.toLocaleString()} for ${payoutDetails.period} has been processed`,
    icon: '/icon-192.png',
    data: {
      type: 'PAYOUT_PROCESSED',
      amount: payoutDetails.amount,
      url: '/driver/earnings'
    }
  }

  return await sendPushToUser(driverId, payload)
}

export async function notifyCustomerArriving(customerId: string, tripDetails: {
  driverName: string
  vehicleDetails: string
  estimatedArrival: number
}) {
  const payload: NotificationPayload = {
    title: '🚗 Driver Approaching',
    body: `${tripDetails.driverName} will arrive in ~${tripDetails.estimatedArrival} minutes`,
    icon: '/icon-192.png',
    data: {
      type: 'DRIVER_ARRIVING',
      url: '/trips'
    }
  }

  return await sendPushToUser(customerId, payload)
}

export async function notifyTripStarted(customerId: string, tripDetails: {
  driverName: string
  destination: string
}) {
  const payload: NotificationPayload = {
    title: '✅ Trip Started',
    body: `${tripDetails.driverName} has started your trip to ${tripDetails.destination}`,
    icon: '/icon-192.png',
    data: {
      type: 'TRIP_STARTED',
      url: '/trips'
    }
  }

  return await sendPushToUser(customerId, payload)
}

export async function notifyTripCompleted(customerId: string, tripDetails: {
  driverName: string
  destination: string
  bookingId: string
}) {
  const payload: NotificationPayload = {
    title: '🎉 Trip Completed',
    body: `You've arrived at ${tripDetails.destination}. Please rate your experience!`,
    icon: '/icon-192.png',
    data: {
      type: 'TRIP_COMPLETED',
      bookingId: tripDetails.bookingId,
      url: `/trips/${tripDetails.bookingId}/rate`
    },
    actions: [
      { action: 'rate', title: 'Rate Trip', icon: '/icons/star.png' }
    ]
  }

  return await sendPushToUser(customerId, payload)
}

/**
 * Get public VAPID key for client-side subscription
 */
export function getPublicVapidKey(): string {
  return VAPID_PUBLIC_KEY
}

/**
 * Check if push notifications are configured
 */
export function isPushConfigured(): boolean {
  return !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY)
}
