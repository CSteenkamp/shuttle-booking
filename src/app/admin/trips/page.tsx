'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import { generateTimeSlots, TimeSlot } from '@/lib/time-slots'

interface Trip {
  id: string
  destination: {
    name: string
    address: string
  }
  startTime: string
  endTime: string
  maxPassengers: number
  currentPassengers: number
  status: string
  bookings: unknown[]
}

interface Location {
  id: string
  name: string
  address: string
  isFrequent: boolean
  category?: string
}

export default function TripsManagement() {
  const { data: session, status } = useSession()
  const [trips, setTrips] = useState<Trip[]>([])
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedDestination, setSelectedDestination] = useState('')
  const [customDestination, setCustomDestination] = useState('')
  const [locations, setLocations] = useState<Location[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      redirect('/auth/signin')
    }
  }, [session, status])

  useEffect(() => {
    const date = new Date(selectedDate)
    const slots = generateTimeSlots(date)
    setTimeSlots(slots)
  }, [selectedDate])

  useEffect(() => {
    fetchTrips()
  }, [selectedDate])

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations')
      if (response.ok) {
        const data = await response.json()
        setLocations(data)
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  const createTrip = async (slotIndex: number) => {
    if (!selectedDestination && !customDestination.trim()) {
      alert('Please select a destination or enter a custom destination')
      return
    }

    const slot = timeSlots[slotIndex]
    setLoading(true)
    
    try {
      const requestBody: any = {
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
      }

      if (selectedDestination === 'custom') {
        requestBody.customDestination = customDestination.trim()
      } else {
        requestBody.destinationId = selectedDestination
      }

      const response = await fetch('/api/admin/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      if (response.ok) {
        alert('Trip created successfully!')
        fetchTrips()
        setSelectedDestination('')
        setCustomDestination('')
      } else {
        const errorData = await response.json()
        alert(`Failed to create trip: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error creating trip:', error)
      alert('Error creating trip')
    } finally {
      setLoading(false)
    }
  }

  const fetchTrips = async () => {
    try {
      const response = await fetch(`/api/admin/trips?date=${selectedDate}`)
      if (response.ok) {
        const data = await response.json()
        setTrips(data)
      }
    } catch (error) {
      console.error('Error fetching trips:', error)
    }
  }

  const cancelTrip = async (tripId: string) => {
    if (!confirm('Are you sure you want to cancel this trip? This will notify all passengers.')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/trips/${tripId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Trip cancelled successfully')
        fetchTrips()
      } else {
        alert('Failed to cancel trip')
      }
    } catch (error) {
      console.error('Error cancelling trip:', error)
      alert('Error cancelling trip')
    }
  }

  if (status === 'loading') {
    return (
      <AdminLayout>
        <div className="p-8">Loading...</div>
      </AdminLayout>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Trip Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Create, manage, and monitor shuttle trips
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Trip Creation */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">🚐</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create New Trip</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                  🎯 Destination
                </label>
                <div className="relative">
                  <select
                    value={selectedDestination}
                    onChange={(e) => {
                      setSelectedDestination(e.target.value)
                      if (e.target.value !== 'custom') {
                        setCustomDestination('')
                      }
                    }}
                    className="w-full appearance-none border-2 border-gray-200 dark:border-gray-600 rounded-2xl px-5 py-4 pr-12 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 bg-gradient-to-r from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 backdrop-blur-sm text-gray-900 dark:text-white font-medium shadow-lg hover:shadow-xl hover:scale-[1.02] cursor-pointer"
                  >
                    <option value="" className="text-gray-500 dark:text-gray-400">
                      ✨ Choose your destination
                    </option>
                    
                    {locations.filter(loc => loc.isFrequent).length > 0 && (
                      <optgroup label="🌟 Frequent Destinations">
                        {locations
                          .filter(loc => loc.isFrequent)
                          .map(location => (
                            <option key={location.id} value={location.id} className="py-2">
                              🏢 {location.name}
                            </option>
                          ))
                        }
                      </optgroup>
                    )}
                    
                    <optgroup label="📍 Other Options">
                      <option value="custom" className="py-2 font-semibold text-emerald-600 dark:text-emerald-400">
                        ➕ Create Custom Destination
                      </option>
                    </optgroup>
                  </select>
                  
                  {/* Custom dropdown arrow */}
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                    <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                {selectedDestination === 'custom' && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-600 animate-in slide-in-from-top-4 duration-300">
                    <label className="block text-sm font-semibold text-emerald-700 dark:text-emerald-300 mb-2">
                      📍 Custom Destination Address
                    </label>
                    <input
                      type="text"
                      placeholder="Enter the exact address (e.g., 123 Main Street, City, State)"
                      value={customDestination}
                      onChange={(e) => setCustomDestination(e.target.value)}
                      className="w-full border-2 border-emerald-200 dark:border-emerald-600 rounded-xl px-4 py-3 focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 shadow-inner"
                    />
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      This will create a new destination in the system
                    </p>
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                  Available Time Slots
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto bg-gray-50 dark:bg-gray-700/30 rounded-xl p-3">
                  {timeSlots.map((slot, index) => (
                    <button
                      key={index}
                      onClick={() => createTrip(index)}
                      disabled={loading}
                      className="p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:border-emerald-300 dark:hover:border-emerald-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800"
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Existing Trips */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold text-lg">📋</span>
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Trips for {new Date(selectedDate).toLocaleDateString()}
                </h2>
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                {trips.length} trips
              </span>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {trips.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🚐</span>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">No trips scheduled for this date</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Create a new trip using the form on the left</p>
                </div>
              ) : (
                trips.map((trip) => (
                  <div key={trip.id} className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{trip.destination.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{trip.destination.address}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(trip.startTime).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })} - {new Date(trip.endTime).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                        
                        {/* Passenger List */}
                        {trip.bookings && trip.bookings.length > 0 && (
                          <div className="mt-3">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Passengers:</p>
                            <div className="flex flex-wrap gap-1">
                              {trip.bookings.map((booking, index) => (
                                <span key={index} className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 px-2 py-1 rounded-full">
                                  {booking.user?.name || 'Unknown'}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right ml-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {trip.currentPassengers}/{trip.maxPassengers}
                          </span>
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                            👥
                          </div>
                        </div>
                        
                        <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                          trip.status === 'SCHEDULED' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                          trip.status === 'IN_PROGRESS' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                          trip.status === 'COMPLETED' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                          'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                        }`}>
                          {trip.status}
                        </span>
                        
                        {trip.status === 'SCHEDULED' && (
                          <button
                            onClick={() => cancelTrip(trip.id)}
                            className="block w-full mt-2 text-xs text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium"
                          >
                            Cancel Trip
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}