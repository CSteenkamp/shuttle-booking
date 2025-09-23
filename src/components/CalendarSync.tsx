'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { 
  generateCalendarEvent, 
  generateICSFile, 
  getCalendarUrl, 
  detectCalendarProvider,
  type BookingDetails 
} from '@/lib/calendar'

interface CalendarSyncProps {
  bookingId?: string
  bookings?: BookingDetails[]
  autoSync?: boolean
  onSyncComplete?: () => void
  onError?: (error: string) => void
}

export default function CalendarSync({ 
  bookingId, 
  bookings, 
  autoSync = false,
  onSyncComplete,
  onError 
}: CalendarSyncProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string>('')
  const [preferredProvider, setPreferredProvider] = useState<'google' | 'outlook' | 'apple' | 'ics'>('google')
  const [bookingData, setBookingData] = useState<BookingDetails[]>([])

  useEffect(() => {
    // Auto-detect user's preferred calendar
    setPreferredProvider(detectCalendarProvider())
    
    // Fetch booking data if bookingId provided
    if (bookingId) {
      fetchBookingData()
    } else if (bookings) {
      setBookingData(bookings)
    }
  }, [bookingId, bookings])

  useEffect(() => {
    // Auto-sync if enabled and we have booking data
    if (autoSync && bookingData.length > 0) {
      handleSyncToCalendar()
    }
  }, [autoSync, bookingData])

  const fetchBookingData = async () => {
    if (!bookingId) return
    
    setLoading(true)
    setSyncStatus('Loading booking data...')
    
    try {
      const response = await fetch(`/api/user/bookings/${bookingId}`)
      if (response.ok) {
        const booking = await response.json()
        setBookingData([booking])
        setSyncStatus('')
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Failed to fetch booking data (${response.status})`)
      }
    } catch (error) {
      console.error('Error fetching booking:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch booking data'
      setSyncStatus(`Error: ${errorMessage}`)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncToCalendar = async () => {
    if (bookingData.length === 0) {
      setSyncStatus('No bookings to sync')
      onError?.('No bookings available to sync')
      return
    }

    setLoading(true)
    setSyncStatus('Preparing calendar events...')

    try {
      let syncedCount = 0
      
      for (const booking of bookingData) {
        try {
          // Ensure booking has user data for calendar generation
          const bookingWithUser = {
            ...booking,
            user: booking.user || {
              name: session?.user?.name || 'User',
              email: session?.user?.email || 'user@example.com'
            }
          }
          
          const event = generateCalendarEvent(bookingWithUser as BookingDetails)
          const calendarUrl = getCalendarUrl(event, preferredProvider)
          
          if (preferredProvider === 'apple' || preferredProvider === 'ics') {
            // Download ICS file
            const icsContent = generateICSFile(event)
            const blob = new Blob([icsContent], { type: 'text/calendar' })
            const url = URL.createObjectURL(blob)
            
            const link = document.createElement('a')
            link.href = url
            link.download = `shuttle-${booking.id}.ics`
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
            
            syncedCount++
          } else {
            // Open calendar provider
            const opened = window.open(calendarUrl, '_blank')
            if (opened) {
              syncedCount++
            } else {
              throw new Error('Popup blocked - please allow popups for calendar sync')
            }
          }
          
          // Small delay between opening multiple calendar tabs
          if (bookingData.length > 1 && preferredProvider !== 'ics' && preferredProvider !== 'apple') {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        } catch (bookingError) {
          console.error(`Error syncing booking ${booking.id}:`, bookingError)
          // Continue with other bookings
        }
      }

      if (syncedCount > 0) {
        setSyncStatus(`Successfully synced ${syncedCount} trip(s) to calendar`)
        onSyncComplete?.()
        
        // Save user's calendar preference
        await saveCalendarPreference(preferredProvider)
      } else {
        throw new Error('No trips could be synced to calendar')
      }
      
    } catch (error) {
      console.error('Error syncing to calendar:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to sync to calendar'
      setSyncStatus(`Failed to sync: ${errorMessage}`)
      onError?.(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const saveCalendarPreference = async (provider: string) => {
    try {
      await fetch('/api/user/calendar-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      })
    } catch (error) {
      console.error('Error saving calendar preference:', error)
    }
  }

  const handleProviderChange = (provider: 'google' | 'outlook' | 'apple' | 'ics') => {
    setPreferredProvider(provider)
  }

  if (!session) return null

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Calendar Integration</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Add your shuttle trips to your personal calendar
          </p>
        </div>
        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
          <span className="text-white text-2xl">📅</span>
        </div>
      </div>

      {/* Calendar Provider Selection */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
          Choose your calendar:
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleProviderChange('google')}
            className={`p-3 rounded-lg border-2 transition-all duration-200 ${
              preferredProvider === 'google'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-lg">📆</span>
              <span className="font-medium text-gray-900 dark:text-white">Google Calendar</span>
            </div>
          </button>

          <button
            onClick={() => handleProviderChange('outlook')}
            className={`p-3 rounded-lg border-2 transition-all duration-200 ${
              preferredProvider === 'outlook'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-lg">📧</span>
              <span className="font-medium text-gray-900 dark:text-white">Outlook</span>
            </div>
          </button>

          <button
            onClick={() => handleProviderChange('apple')}
            className={`p-3 rounded-lg border-2 transition-all duration-200 ${
              preferredProvider === 'apple'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-lg">🍎</span>
              <span className="font-medium text-gray-900 dark:text-white">Apple Calendar</span>
            </div>
          </button>

          <button
            onClick={() => handleProviderChange('ics')}
            className={`p-3 rounded-lg border-2 transition-all duration-200 ${
              preferredProvider === 'ics'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <span className="text-lg">📋</span>
              <span className="font-medium text-gray-900 dark:text-white">Download (.ics)</span>
            </div>
          </button>
        </div>
      </div>

      {/* Booking Summary */}
      {bookingData.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
            {bookingData.length === 1 ? 'Trip to sync:' : `${bookingData.length} trips to sync:`}
          </h4>
          {bookingData.slice(0, 3).map((booking, index) => (
            <div key={booking.id} className="text-sm text-gray-600 dark:text-gray-400">
              • {booking.trip.destination.name} - {new Date(booking.trip.startTime).toLocaleDateString()}
            </div>
          ))}
          {bookingData.length > 3 && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              ... and {bookingData.length - 3} more trips
            </div>
          )}
        </div>
      )}

      {/* Sync Button */}
      <button
        onClick={handleSyncToCalendar}
        disabled={loading || bookingData.length === 0}
        className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 font-semibold flex items-center justify-center space-x-2"
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            <span>Syncing...</span>
          </>
        ) : (
          <>
            <span>📅</span>
            <span>
              {bookingData.length === 1 
                ? 'Add to Calendar' 
                : `Add ${bookingData.length} Trips to Calendar`
              }
            </span>
          </>
        )}
      </button>

      {/* Status Message */}
      {syncStatus && (
        <div className={`mt-4 p-3 rounded-lg text-sm ${
          syncStatus.includes('Successfully') 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
        }`}>
          {syncStatus}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
        <h5 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">How it works:</h5>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Google/Outlook: Opens calendar in new tab</li>
          <li>• Apple Calendar: Downloads .ics file to import</li>
          <li>• Includes pickup location, destination, and passenger details</li>
          <li>• Sets automatic reminders 15 and 5 minutes before departure</li>
        </ul>
      </div>
    </div>
  )
}