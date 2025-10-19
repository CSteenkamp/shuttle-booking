/**
 * Client-side Push Notification Subscription
 * Manages service worker and push subscriptions
 */

'use client'

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/**
 * Get current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!isPushSupported()) {
    return 'denied'
  }
  return Notification.permission
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isPushSupported()) {
    throw new Error('Push notifications are not supported')
  }

  const permission = await Notification.requestPermission()
  return permission
}

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers are not supported')
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    })

    console.log('Service Worker registered:', registration)

    // Wait for service worker to be ready
    await navigator.serviceWorker.ready

    return registration
  } catch (error) {
    console.error('Service Worker registration failed:', error)
    throw error
  }
}

/**
 * Get VAPID public key from server
 */
async function getVapidPublicKey(): Promise<string> {
  const response = await fetch('/api/push/vapid-key')
  const data = await response.json()

  if (!data.success || !data.publicKey) {
    throw new Error('Failed to get VAPID public key')
  }

  return data.publicKey
}

/**
 * Convert base64 VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }

  return outputArray
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // Check support
    if (!isPushSupported()) {
      return {
        success: false,
        error: 'Push notifications are not supported in this browser'
      }
    }

    // Request permission
    const permission = await requestNotificationPermission()
    if (permission !== 'granted') {
      return {
        success: false,
        error: 'Notification permission denied'
      }
    }

    // Register service worker
    const registration = await registerServiceWorker()

    // Get VAPID public key
    const vapidPublicKey = await getVapidPublicKey()
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource
    })

    console.log('Push subscription:', subscription)

    // Send subscription to server
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscription: {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
            auth: arrayBufferToBase64(subscription.getKey('auth')!)
          }
        }
      })
    })

    const data = await response.json()

    if (!data.success) {
      return {
        success: false,
        error: data.error || 'Failed to subscribe on server'
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error subscribing to push:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to subscribe'
    }
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    if (!('serviceWorker' in navigator)) {
      return {
        success: false,
        error: 'Service workers are not supported'
      }
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      return { success: true } // Already unsubscribed
    }

    // Unsubscribe from push manager
    await subscription.unsubscribe()

    // Notify server
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        endpoint: subscription.endpoint
      })
    })

    return { success: true }
  } catch (error) {
    console.error('Error unsubscribing from push:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to unsubscribe'
    }
  }
}

/**
 * Check if user is subscribed to push notifications
 */
export async function isPushSubscribed(): Promise<boolean> {
  try {
    if (!('serviceWorker' in navigator)) {
      return false
    }

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()

    return !!subscription
  } catch (error) {
    console.error('Error checking push subscription:', error)
    return false
  }
}

/**
 * Get current push subscription
 */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  try {
    if (!('serviceWorker' in navigator)) {
      return null
    }

    const registration = await navigator.serviceWorker.ready
    return await registration.pushManager.getSubscription()
  } catch (error) {
    console.error('Error getting push subscription:', error)
    return null
  }
}

/**
 * Send test notification
 */
export async function sendTestNotification(): Promise<{ success: boolean }> {
  try {
    const response = await fetch('/api/push/test', {
      method: 'POST'
    })

    const data = await response.json()
    return { success: data.success }
  } catch (error) {
    console.error('Error sending test notification:', error)
    return { success: false }
  }
}

/**
 * Helper: Convert ArrayBuffer to Base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}

/**
 * Show browser notification (for testing)
 */
export async function showBrowserNotification(
  title: string,
  options?: NotificationOptions
): Promise<void> {
  if (!isPushSupported()) {
    throw new Error('Notifications are not supported')
  }

  const permission = await requestNotificationPermission()
  if (permission !== 'granted') {
    throw new Error('Notification permission not granted')
  }

  const registration = await navigator.serviceWorker.ready
  await registration.showNotification(title, {
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    ...options
  })
}
