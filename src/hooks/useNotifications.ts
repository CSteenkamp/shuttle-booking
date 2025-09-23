'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  priority: string
  status: string
  createdAt: string
  readAt?: string
  actionUrl?: string
  booking?: {
    id: string
    trip: {
      destination: {
        name: string
      }
      startTime: string
    }
  }
  trip?: {
    destination: {
      name: string
    }
    startTime: string
  }
}

interface NotificationPreferences {
  id: string
  emailEnabled: boolean
  bookingConfirmations: boolean
  tripReminders: boolean
  tripUpdates: boolean
  paymentNotifications: boolean
  systemAnnouncements: boolean
  adminMessages: boolean
  smsEnabled: boolean
  smsBookingConfirms: boolean
  smsTripReminders: boolean
  smsTripUpdates: boolean
  smsPaymentNotifs: boolean
  pushEnabled: boolean
  pushBookingConfirms: boolean
  pushTripReminders: boolean
  pushTripUpdates: boolean
  pushPaymentNotifs: boolean
  reminderHours: number
  secondReminderMinutes: number
}

export function useNotifications() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null)

  // Fetch notifications
  const fetchNotifications = useCallback(async (options: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
    type?: string
  } = {}) => {
    if (!session) return

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (options.limit) params.set('limit', options.limit.toString())
      if (options.offset) params.set('offset', options.offset.toString())
      if (options.unreadOnly) params.set('unreadOnly', 'true')
      if (options.type) params.set('type', options.type)

      const response = await fetch(`/api/notifications?${params}`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error('Error fetching notifications:', error)
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }, [session])

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!session) return

    try {
      const response = await fetch('/api/notifications/count')
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }, [session])

  // Fetch preferences
  const fetchPreferences = useCallback(async () => {
    if (!session) return

    try {
      const response = await fetch('/api/notifications/preferences')
      if (response.ok) {
        const data = await response.json()
        setPreferences(data)
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
    }
  }, [session])

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'markAsRead',
          notificationId
        })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, status: 'READ', readAt: new Date().toISOString() }
              : n
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
        toast.success('Notification marked as read')
      } else {
        toast.error('Failed to mark notification as read')
      }
    } catch (error) {
      console.error('Error marking notification as read:', error)
      toast.error('Failed to mark notification as read')
    }
  }, [])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAllAsRead' })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, status: 'READ', readAt: new Date().toISOString() }))
        )
        setUnreadCount(0)
        toast.success('All notifications marked as read')
      } else {
        toast.error('Failed to mark all notifications as read')
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error)
      toast.error('Failed to mark all notifications as read')
    }
  }, [])

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete',
          notificationId
        })
      })

      if (response.ok) {
        const wasUnread = notifications.find(n => n.id === notificationId)?.status === 'UNREAD'
        setNotifications(prev => prev.filter(n => n.id !== notificationId))
        if (wasUnread) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
        toast.success('Notification deleted')
      } else {
        toast.error('Failed to delete notification')
      }
    } catch (error) {
      console.error('Error deleting notification:', error)
      toast.error('Failed to delete notification')
    }
  }, [notifications])

  // Update preferences
  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPreferences)
      })

      if (response.ok) {
        const data = await response.json()
        setPreferences(data)
        toast.success('Notification preferences updated')
        return data
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update preferences')
      }
    } catch (error) {
      console.error('Error updating preferences:', error)
      toast.error('Failed to update preferences')
    }
  }, [])

  // Show notification toast
  const showToast = useCallback((notification: {
    type: 'success' | 'error' | 'loading' | 'custom'
    title: string
    message?: string
    duration?: number
  }) => {
    const content = notification.message 
      ? `${notification.title}\n${notification.message}`
      : notification.title

    switch (notification.type) {
      case 'success':
        return toast.success(content, { duration: notification.duration })
      case 'error':
        return toast.error(content, { duration: notification.duration })
      case 'loading':
        return toast.loading(content, { duration: notification.duration })
      default:
        return toast(content, { duration: notification.duration })
    }
  }, [])

  // Initial data fetch
  useEffect(() => {
    if (session) {
      fetchNotifications()
      fetchUnreadCount()
      fetchPreferences()
    }
  }, [session, fetchNotifications, fetchUnreadCount, fetchPreferences])

  // Periodic unread count refresh
  useEffect(() => {
    if (!session) return

    const interval = setInterval(() => {
      fetchUnreadCount()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [session, fetchUnreadCount])

  return {
    notifications,
    unreadCount,
    loading,
    preferences,
    fetchNotifications,
    fetchUnreadCount,
    fetchPreferences,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences,
    showToast
  }
}