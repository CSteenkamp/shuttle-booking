'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import CalendarSync from '@/components/CalendarSync'
import { getUserDisplayName } from '@/lib/utils'

interface Booking {
  id: string
  trip: {
    destination: {
      name: string
      address: string
    }
    startTime: string
    endTime: string
  }
  pickupLocation: {
    address: string
  }
  rider?: {
    name: string
    phone?: string
  }
  user: {
    name: string
    email: string
  }
}

export default function CalendarPage() {
  const { data: session, status } = useSession()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      redirect('/auth/signin')
    }
  }, [session, status])

  useEffect(() => {
    if (session) {
      fetchData()
    }
  }, [session])

  const fetchData = async () => {
    try {
      // Fetch user's upcoming bookings
      const bookingsResponse = await fetch('/api/user/bookings')
      if (bookingsResponse.ok) {
        const bookingsData = await bookingsResponse.json()
        // Filter for future trips only
        const futureBookings = bookingsData.filter((booking: Booking) => 
          new Date(booking.trip.startTime) > new Date()
        )
        setBookings(futureBookings)
      }

      // Fetch auto-sync status
      const syncStatusResponse = await fetch('/api/user/calendar-sync?action=status')
      if (syncStatusResponse.ok) {
        const statusData = await syncStatusResponse.json()
        setAutoSyncEnabled(statusData.autoSyncEnabled)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleAutoSync = async () => {
    try {
      setSyncing(true)
      const response = await fetch('/api/user/calendar-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'toggle-auto-sync',
          enabled: !autoSyncEnabled
        })
      })

      if (response.ok) {
        setAutoSyncEnabled(!autoSyncEnabled)
        alert(`Auto calendar sync ${!autoSyncEnabled ? 'enabled' : 'disabled'}!`)
      } else {
        alert('Failed to update auto sync setting')
      }
    } catch (error) {
      console.error('Error toggling auto sync:', error)
      alert('Error updating setting')
    } finally {
      setSyncing(false)
    }
  }

  const handleSyncAllBookings = async () => {
    try {
      setSyncing(true)
      const response = await fetch('/api/user/calendar-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync-all' })
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Successfully synced ${result.synced} trips to your calendar!`)
      } else {
        alert('Failed to sync bookings')
      }
    } catch (error) {
      console.error('Error syncing all bookings:', error)
      alert('Error syncing bookings')
    } finally {
      setSyncing(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-indigo-900 flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl mx-auto mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

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
                  Tjoef-Tjaf
                </h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <span className="text-gray-700 dark:text-gray-200 font-medium">
                Welcome, {getUserDisplayName(session)}
              </span>
              {session?.user.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                >
                  Admin Panel
                </Link>
              )}
              <Link
                href="/book"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors duration-200 font-medium"
              >
                Book Trip
              </Link>
              <Link
                href="/profile"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors duration-200 font-medium"
              >
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
            📅 Calendar Integration
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Never miss a shuttle trip with automatic calendar sync
          </p>
        </div>

        {/* Auto-Sync Settings */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Auto Calendar Sync</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Automatically add new bookings to your calendar
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`text-sm font-medium ${
                autoSyncEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'
              }`}>
                {autoSyncEnabled ? 'Enabled' : 'Disabled'}
              </span>
              <button
                onClick={handleToggleAutoSync}
                disabled={syncing}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  autoSyncEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoSyncEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {autoSyncEnabled && (
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-600 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 dark:text-green-200 mb-2">✅ Auto-sync is active!</h4>
              <p className="text-sm text-green-800 dark:text-green-300">
                All new shuttle bookings will automatically be added to your calendar with email invites.
              </p>
            </div>
          )}
        </div>

        {/* Manual Sync Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Sync All Bookings */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">📅</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Sync All Upcoming Trips
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Add all your future shuttle trips to your calendar at once
              </p>
              <button
                onClick={handleSyncAllBookings}
                disabled={syncing || bookings.length === 0}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
              >
                {syncing ? 'Syncing...' : `Sync ${bookings.length} Trip${bookings.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>

          {/* Individual Booking Sync */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">📱</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Custom Calendar Sync
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Choose your calendar provider and sync individual trips
              </p>
              <Link
                href="#calendar-sync"
                className="inline-block w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 px-4 rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 font-semibold text-center"
              >
                Choose Calendar
              </Link>
            </div>
          </div>
        </div>

        {/* Upcoming Trips */}
        {bookings.length > 0 && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
              Upcoming Trips ({bookings.length})
            </h2>
            <div className="space-y-4">
              {bookings.slice(0, 5).map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {booking.trip.destination.name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(booking.trip.startTime).toLocaleDateString()} at{' '}
                      {new Date(booking.trip.startTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {booking.rider && (
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        Passenger: {booking.rider.name}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      fetch('/api/user/calendar-sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'sync-booking',
                          bookingId: booking.id
                        })
                      }).then(() => alert('Trip synced to calendar!'))
                    }}
                    className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
                  >
                    📅 Sync
                  </button>
                </div>
              ))}
              {bookings.length > 5 && (
                <p className="text-center text-gray-500 dark:text-gray-400 text-sm">
                  ... and {bookings.length - 5} more trips
                </p>
              )}
            </div>
          </div>
        )}

        {/* Calendar Sync Component */}
        <div id="calendar-sync">
          <CalendarSync 
            bookings={bookings}
            onSyncComplete={() => {
              alert('Calendar sync completed!')
            }}
            onError={(error) => {
              alert(`Calendar sync failed: ${error}`)
            }}
          />
        </div>

        {/* No Bookings State */}
        {bookings.length === 0 && (
          <div className="text-center py-12">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📅</span>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              No Upcoming Trips
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You don't have any scheduled shuttle trips. Book a trip to see calendar integration in action!
            </p>
            <Link
              href="/book"
              className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-8 py-3 rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 font-semibold"
            >
              Book Your First Trip
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}