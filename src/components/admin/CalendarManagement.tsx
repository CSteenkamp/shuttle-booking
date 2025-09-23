'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface CalendarSettings {
  google_calendar_service_account: string
  google_calendar_id: string
  google_calendar_impersonate_email: string
  calendar_availability_enabled: string
  calendar_sync_enabled: string
}

interface AvailabilitySlot {
  startTime: string
  endTime: string
  available: boolean
  reason?: string
}

interface DayAvailability {
  date: string
  totalSlots: number
  availableSlots: number
  availabilityRate: string
  slots: AvailabilitySlot[]
}

export default function CalendarManagement() {
  const [settings, setSettings] = useState<CalendarSettings>({
    google_calendar_service_account: '',
    google_calendar_id: '',
    google_calendar_impersonate_email: '',
    calendar_availability_enabled: 'true',
    calendar_sync_enabled: 'true'
  })
  
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [availabilityDate, setAvailabilityDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [availability, setAvailability] = useState<DayAvailability | null>(null)
  const [testBookingId, setTestBookingId] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings')
      if (response.ok) {
        const data = await response.json()
        const settingsMap: Record<string, string> = {}
        data.forEach((setting: { key: string; value: string }) => {
          settingsMap[setting.key] = setting.value
        })
        setSettings(prev => ({ ...prev, ...settingsMap }))
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load calendar settings')
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (key: string, value: string) => {
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      })

      if (response.ok) {
        setSettings(prev => ({ ...prev, [key]: value }))
        toast.success('Setting updated successfully')
      } else {
        toast.error('Failed to update setting')
      }
    } catch (error) {
      console.error('Error updating setting:', error)
      toast.error('Failed to update setting')
    }
  }

  const testCalendarConnection = async () => {
    if (!settings.google_calendar_service_account || !settings.google_calendar_id) {
      toast.error('Please configure Google Calendar settings first')
      return
    }

    setTesting(true)
    try {
      const response = await fetch('/api/calendar/test-connection', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`✅ ${result.message}`)
        console.log('Calendar connection details:', result)
      } else {
        const error = await response.json()
        toast.error(`❌ Connection failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Error testing calendar connection:', error)
      toast.error('Failed to test calendar connection')
    } finally {
      setTesting(false)
    }
  }

  const checkAvailability = async () => {
    if (!availabilityDate) {
      toast.error('Please select a date')
      return
    }

    setTesting(true)
    try {
      const response = await fetch(
        `/api/calendar/availability?date=${availabilityDate}`,
        { method: 'GET' }
      )

      if (response.ok) {
        const data = await response.json()
        setAvailability(data)
        toast.success(`Availability checked for ${availabilityDate}`)
      } else {
        const error = await response.json()
        toast.error(`Failed to check availability: ${error.error}`)
      }
    } catch (error) {
      console.error('Error checking availability:', error)
      toast.error('Failed to check availability')
    } finally {
      setTesting(false)
    }
  }

  const debugCalendarEvents = async () => {
    if (!availabilityDate) {
      toast.error('Please select a date first')
      return
    }

    setTesting(true)
    try {
      const response = await fetch(
        `/api/calendar/debug-events?date=${availabilityDate}`,
        { method: 'GET' }
      )

      if (response.ok) {
        const data = await response.json()
        console.log('📅 Calendar Debug Results:', data)
        toast.success(`Found ${data.eventsFound} events for ${availabilityDate}. Check console for details.`)
      } else {
        const error = await response.json()
        toast.error(`Debug failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Error debugging calendar:', error)
      toast.error('Failed to debug calendar')
    } finally {
      setTesting(false)
    }
  }

  const testCalendarSync = async () => {
    if (!testBookingId) {
      toast.error('Please enter a booking ID to test')
      return
    }

    setTesting(true)
    try {
      const response = await fetch('/api/calendar/create-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: testBookingId })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Calendar event created using ${data.provider}: ${data.eventId}`)
      } else {
        const error = await response.json()
        toast.error(`Calendar sync failed: ${error.error}`)
      }
    } catch (error) {
      console.error('Error testing calendar sync:', error)
      toast.error('Failed to test calendar sync')
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    )
  }

  const isConfigured = settings.google_calendar_service_account && settings.google_calendar_id

  return (
    <div className="space-y-6">
      {/* Configuration Status */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className={`w-3 h-3 rounded-full ${isConfigured ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            Google Calendar Integration Status
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className={`text-2xl font-bold ${settings.google_calendar_service_account ? 'text-green-600' : 'text-red-600'}`}>
              {settings.google_calendar_service_account ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Service Account</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className={`text-2xl font-bold ${settings.google_calendar_id ? 'text-green-600' : 'text-red-600'}`}>
              {settings.google_calendar_id ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Calendar ID</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className={`text-2xl font-bold ${settings.calendar_sync_enabled === 'true' ? 'text-green-600' : 'text-gray-600'}`}>
              {settings.calendar_sync_enabled === 'true' ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Auto Sync</div>
          </div>
          
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className={`text-2xl font-bold ${settings.calendar_availability_enabled === 'true' ? 'text-green-600' : 'text-gray-600'}`}>
              {settings.calendar_availability_enabled === 'true' ? '✓' : '✗'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Availability Check</div>
          </div>
        </div>
      </div>

      {/* Test Connection */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          🔗 Test Calendar Connection
        </h3>
        
        <div className="space-y-4">
          <button
            onClick={testCalendarConnection}
            disabled={testing || !isConfigured}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg transition-all duration-200 font-medium"
          >
            {testing ? 'Testing Connection...' : 'Test Google Calendar Connection'}
          </button>
          
          {!isConfigured && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Please configure Service Account and Calendar ID in the Calendar settings tab first.
            </p>
          )}
        </div>
      </div>

      {/* Availability Checking */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          📅 Check Calendar Availability
        </h3>
        
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="date"
              value={availabilityDate}
              onChange={(e) => setAvailabilityDate(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={checkAvailability}
              disabled={testing || !isConfigured}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-all duration-200 font-medium"
            >
              {testing ? 'Checking...' : 'Check Availability'}
            </button>
            <button
              onClick={debugCalendarEvents}
              disabled={testing || !isConfigured}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-all duration-200 font-medium"
            >
              {testing ? 'Debugging...' : '🔍 Debug Events'}
            </button>
          </div>
          
          {availability && (
            <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Availability for {new Date(availability.date).toLocaleDateString()}
              </h4>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {availability.availableSlots} of {availability.totalSlots} slots available ({availability.availabilityRate}%)
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                {availability.slots.map((slot, index) => (
                  <div
                    key={index}
                    className={`p-2 text-xs rounded text-center ${
                      slot.available 
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                        : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                    }`}
                    title={slot.reason}
                  >
                    {new Date(slot.startTime).toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Test Calendar Sync */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          🔄 Test Calendar Sync
        </h3>
        
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              value={testBookingId}
              onChange={(e) => setTestBookingId(e.target.value)}
              placeholder="Enter booking ID to test sync"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={testCalendarSync}
              disabled={testing || !testBookingId}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg transition-all duration-200 font-medium"
            >
              {testing ? 'Syncing...' : 'Test Sync'}
            </button>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Enter an existing booking ID to test creating a calendar event for that booking.
          </p>
        </div>
      </div>

      {/* Quick Settings Toggle */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          ⚙️ Quick Settings
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Auto Calendar Sync</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Automatically sync new bookings</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.calendar_sync_enabled === 'true'}
                onChange={(e) => updateSetting('calendar_sync_enabled', e.target.checked ? 'true' : 'false')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Availability Checking</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Check calendar for conflicts</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.calendar_availability_enabled === 'true'}
                onChange={(e) => updateSetting('calendar_availability_enabled', e.target.checked ? 'true' : 'false')}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}