'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useNotifications } from '@/hooks/useNotifications'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { getUserDisplayName } from '@/lib/utils'

export default function NotificationsPage() {
  const { data: session, status } = useSession()
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([])
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'read'>('all')
  
  const {
    notifications,
    unreadCount,
    loading,
    preferences,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updatePreferences
  } = useNotifications()

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      redirect('/auth/signin')
    }
  }, [session, status])

  useEffect(() => {
    if (session) {
      fetchNotifications({
        limit: 100,
        unreadOnly: filterType === 'unread'
      })
    }
  }, [session, filterType, fetchNotifications])

  const filteredNotifications = notifications.filter(notification => {
    if (filterType === 'unread') return notification.status === 'UNREAD'
    if (filterType === 'read') return notification.status === 'READ'
    return true
  })

  const handleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([])
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedNotifications.length === 0) return
    
    for (const id of selectedNotifications) {
      await deleteNotification(id)
    }
    setSelectedNotifications([])
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'BOOKING_CONFIRMATION': return '🎫'
      case 'TRIP_REMINDER': return '🚐'
      case 'TRIP_UPDATE': return '📢'
      case 'PAYMENT_CONFIRMATION': return '💳'
      case 'SYSTEM_ANNOUNCEMENT': return '📢'
      case 'ADMIN_MESSAGE': return '📨'
      default: return '🔔'
    }
  }

  if (status === 'loading') {
    return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-indigo-900 flex items-center justify-center">
      <div className="animate-pulse text-center">
        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl mx-auto mb-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto"></div>
      </div>
    </div>
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-indigo-900 transition-colors duration-300">
      {/* Navigation */}
      <nav className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">🚐</span>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  ShuttlePro
                </h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <span className="text-gray-700 dark:text-gray-200 font-medium">
                Welcome, {getUserDisplayName(session)}
              </span>
              <Link href="/profile" className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors duration-200 font-medium">
                Profile
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            🔔 Notifications
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Stay updated with your shuttle bookings and system announcements
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
            {/* Filter Tabs */}
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {(['all', 'unread', 'read'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFilterType(filter)}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors capitalize ${
                    filterType === filter
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {filter} {filter === 'unread' && unreadCount > 0 && `(${unreadCount})`}
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-3">
              {selectedNotifications.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
                >
                  Delete Selected ({selectedNotifications.length})
                </button>
              )}
              
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Mark All Read
                </button>
              )}

              {filteredNotifications.length > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  {selectedNotifications.length === filteredNotifications.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Notifications List */}
        {loading ? (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500 dark:text-gray-400">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-12 text-center">
            <div className="text-6xl mb-4">🔔</div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              No {filterType === 'all' ? '' : filterType} notifications
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {filterType === 'unread' 
                ? "You're all caught up! No unread notifications."
                : "When you receive notifications, they'll appear here."
              }
            </p>
            <Link
              href="/"
              className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 font-semibold"
            >
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 transition-all duration-200 hover:shadow-xl ${
                  notification.status === 'UNREAD' ? 'ring-2 ring-blue-500/20' : ''
                }`}
              >
                <div className="flex items-start space-x-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedNotifications.includes(notification.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedNotifications(prev => [...prev, notification.id])
                      } else {
                        setSelectedNotifications(prev => prev.filter(id => id !== notification.id))
                      }
                    }}
                    className="mt-1 w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />

                  {/* Icon */}
                  <div className="flex-shrink-0 text-3xl">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`text-lg font-semibold ${
                          notification.status === 'UNREAD' 
                            ? 'text-gray-900 dark:text-white' 
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {notification.title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                          {notification.message}
                        </p>

                        {/* Additional Info */}
                        {(notification.booking || notification.trip) && (
                          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              <div className="flex items-center space-x-4">
                                <span>📍 {notification.booking?.trip?.destination?.name || notification.trip?.destination?.name}</span>
                                {(notification.booking?.trip?.startTime || notification.trip?.startTime) && (
                                  <span>🕒 {new Date(notification.booking?.trip?.startTime || notification.trip?.startTime || '').toLocaleString()}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between mt-4">
                          <span className="text-sm text-gray-500 dark:text-gray-500">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                          
                          <div className="flex items-center space-x-3">
                            {notification.status === 'UNREAD' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                                New
                              </span>
                            )}
                            
                            {notification.priority === 'URGENT' && (
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                                Urgent
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 ml-4">
                        {notification.status === 'UNREAD' && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                          >
                            Mark Read
                          </button>
                        )}
                        
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Settings Link */}
        <div className="mt-8 text-center">
          <Link
            href="/notifications/preferences"
            className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
          >
            <span>⚙️</span>
            <span>Notification Preferences</span>
          </Link>
        </div>
      </div>
    </div>
  )
}