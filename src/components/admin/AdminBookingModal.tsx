'use client'

import { useState, useEffect } from 'react'
import { addMinutes, format } from 'date-fns'
import toast from 'react-hot-toast'

interface Trip {
  id: string
  startTime: string
  endTime: string
  maxPassengers: number
  currentPassengers: number
  status: string
  destination: {
    id: string
    name: string
    address: string
  }
}

interface User {
  id: string
  name: string
  email: string
}

interface Rider {
  id: string
  name: string
  phone?: string
}

interface Location {
  id: string
  name: string
  address: string
}

interface AdminBookingModalProps {
  isOpen: boolean
  onClose: () => void
  onBookingCreated: () => void
}

export default function AdminBookingModal({ isOpen, onClose, onBookingCreated }: AdminBookingModalProps) {
  const [loading, setLoading] = useState(false)
  const [trips, setTrips] = useState<Trip[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [riders, setRiders] = useState<Rider[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  
  // Mode selection
  const [bookingMode, setBookingMode] = useState<'existing' | 'new'>('existing')
  
  // Existing trip booking
  const [selectedTripId, setSelectedTripId] = useState('')
  
  // New trip creation
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [destination, setDestination] = useState('')
  const [customDestination, setCustomDestination] = useState('')
  const [maxPassengers, setMaxPassengers] = useState(4)
  
  // Common booking fields
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRiderId, setSelectedRiderId] = useState('')
  const [pickupLocationId, setPickupLocationId] = useState('')
  const [dropoffLocationId, setDropoffLocationId] = useState('')
  const [customPickupAddress, setCustomPickupAddress] = useState('')
  const [customDropoffAddress, setCustomDropoffAddress] = useState('')
  const [useCustomPickup, setUseCustomPickup] = useState(false)
  const [useCustomDropoff, setUseCustomDropoff] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchTrips()
      fetchUsers()
      fetchLocations()
    }
  }, [isOpen])

  useEffect(() => {
    if (selectedUserId) {
      fetchUserRiders(selectedUserId)
    } else {
      setRiders([])
      setSelectedRiderId('')
    }
  }, [selectedUserId])

  const fetchTrips = async () => {
    try {
      // Fetch trips for the next 7 days
      const today = new Date()
      const nextWeek = new Date(today)
      nextWeek.setDate(today.getDate() + 7)
      
      const response = await fetch(`/api/trips?week=${today.toISOString()}`)
      if (response.ok) {
        const data = await response.json()
        setTrips(data.filter((trip: Trip) => trip.status === 'SCHEDULED'))
      }
    } catch (error) {
      console.error('Error fetching trips:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.filter((user: User) => user.name)) // Only users with names
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchUserRiders = async (userId: string) => {
    try {
      const response = await fetch(`/api/user/riders?userId=${userId}`)
      if (response.ok) {
        const data = await response.json()
        setRiders(data)
      }
    } catch (error) {
      console.error('Error fetching user riders:', error)
    }
  }

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/locations')
      if (response.ok) {
        const data = await response.json()
        setLocations(data.filter((loc: Location) => loc.address)) // Only locations with addresses
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!selectedUserId || (!pickupLocationId && !customPickupAddress)) {
      toast.error('Please fill in all required fields', {
        duration: 4000,
        style: {
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          color: 'white',
          padding: '16px 20px',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: '600',
          boxShadow: '0 10px 25px rgba(245, 158, 11, 0.3)',
        },
        icon: '⚠️',
      })
      return
    }

    if (bookingMode === 'existing' && !selectedTripId) {
      toast.error('Please select a trip', {
        duration: 4000,
        style: {
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          color: 'white',
          padding: '16px 20px',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: '600',
          boxShadow: '0 10px 25px rgba(245, 158, 11, 0.3)',
        },
        icon: '⚠️',
      })
      return
    }

    if (bookingMode === 'new' && (!selectedDate || !selectedTime || !destination)) {
      toast.error('Please fill in all trip details', {
        duration: 4000,
        style: {
          background: 'linear-gradient(135deg, #f59e0b, #d97706)',
          color: 'white',
          padding: '16px 20px',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: '600',
          boxShadow: '0 10px 25px rgba(245, 158, 11, 0.3)',
        },
        icon: '⚠️',
      })
      return
    }

    setLoading(true)
    try {
      let tripId = selectedTripId

      // Create new trip if needed
      if (bookingMode === 'new') {
        const [hours, minutes] = selectedTime.split(':').map(Number)
        const startTime = new Date(selectedDate)
        startTime.setHours(hours, minutes, 0, 0)
        const endTime = addMinutes(startTime, 20)

        const tripResponse = await fetch('/api/admin/trips', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            destinationId: destination === 'custom' ? undefined : destination,
            customDestination: destination === 'custom' ? customDestination : undefined,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            maxPassengers,
          }),
        })

        if (!tripResponse.ok) {
          const errorData = await tripResponse.json()
          throw new Error(errorData.error || 'Failed to create trip')
        }

        const newTrip = await tripResponse.json()
        tripId = newTrip.id
      }

      // Create booking
      const bookingData = {
        tripId,
        pickupLocation: useCustomPickup ? customPickupAddress : pickupLocationId,
        dropoffLocation: useCustomDropoff ? customDropoffAddress : (dropoffLocationId || pickupLocationId),
        riderId: selectedRiderId || null,
        adminOverride: true
      }

      const response = await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bookingData, userId: selectedUserId })
      })

      if (response.ok) {
        toast.success(bookingMode === 'new' ? '🚐 Trip created and booking confirmed!' : '🎉 Booking created successfully!', {
          duration: 5000,
          style: {
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
          },
          icon: bookingMode === 'new' ? '🎯' : '✅',
        })
        onBookingCreated()
        handleClose()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create booking', {
          duration: 5000,
          style: {
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)',
          },
          icon: '❌',
        })
      }
    } catch (error) {
      console.error('Error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create booking', {
        duration: 5000,
        style: {
          background: 'linear-gradient(135deg, #ef4444, #dc2626)',
          color: 'white',
          padding: '16px 20px',
          borderRadius: '12px',
          fontSize: '16px',
          fontWeight: '600',
          boxShadow: '0 10px 25px rgba(239, 68, 68, 0.3)',
        },
        icon: '❌',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    // Reset all form fields
    setBookingMode('existing')
    setSelectedTripId('')
    setSelectedDate('')
    setSelectedTime('')
    setDestination('')
    setCustomDestination('')
    setMaxPassengers(4)
    setSelectedUserId('')
    setSelectedRiderId('')
    setPickupLocationId('')
    setDropoffLocationId('')
    setCustomPickupAddress('')
    setCustomDropoffAddress('')
    setUseCustomPickup(false)
    setUseCustomDropoff(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-xl">🎫</span>
              </div>
              <div>
                <h2 className="text-xl font-bold">Admin Booking System</h2>
                <p className="text-sm text-white/80">Create bookings and manage trips</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <form id="admin-booking-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Mode Selection */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-2 border-blue-200 dark:border-blue-600 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-4 flex items-center">
                <span className="mr-2">🎯</span>
                Booking Mode
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <label className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  bookingMode === 'existing' 
                    ? 'border-blue-500 bg-blue-100 dark:bg-blue-800/30' 
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                }`}>
                  <input
                    type="radio"
                    name="bookingMode"
                    value="existing"
                    checked={bookingMode === 'existing'}
                    onChange={(e) => setBookingMode(e.target.value as 'existing' | 'new')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-semibold text-blue-800 dark:text-blue-200">Book Existing Trip</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">Add passengers to scheduled trips</div>
                  </div>
                </label>
                
                <label className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                  bookingMode === 'new' 
                    ? 'border-blue-500 bg-blue-100 dark:bg-blue-800/30' 
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                }`}>
                  <input
                    type="radio"
                    name="bookingMode"
                    value="new"
                    checked={bookingMode === 'new'}
                    onChange={(e) => setBookingMode(e.target.value as 'existing' | 'new')}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="font-semibold text-blue-800 dark:text-blue-200">Create New Trip</div>
                    <div className="text-xs text-blue-600 dark:text-blue-400">Start fresh trip and book immediately</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Existing Trip Selection */}
            {bookingMode === 'existing' && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                  Select Existing Trip *
                </label>
                <div className="relative">
                  <select
                    value={selectedTripId}
                    onChange={(e) => setSelectedTripId(e.target.value)}
                    required={bookingMode === 'existing'}
                    className="w-full appearance-none border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gradient-to-r from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 backdrop-blur-sm text-gray-900 dark:text-white shadow-sm hover:shadow-md font-medium cursor-pointer"
                  >
                    <option value="">Choose a scheduled trip...</option>
                    {trips.map(trip => (
                      <option key={trip.id} value={trip.id}>
                        {trip.destination.name} - {new Date(trip.startTime).toLocaleDateString()} {new Date(trip.startTime).toLocaleTimeString()} 
                        ({trip.currentPassengers}/{trip.maxPassengers} passengers)
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* New Trip Creation */}
            {bookingMode === 'new' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <span className="mr-2">🚐</span>
                  New Trip Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Date *
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      required={bookingMode === 'new'}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm hover:shadow-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Time *
                    </label>
                    <input
                      type="time"
                      value={selectedTime}
                      onChange={(e) => setSelectedTime(e.target.value)}
                      required={bookingMode === 'new'}
                      className="w-full border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm hover:shadow-md"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                    Destination *
                  </label>
                  <div className="relative">
                    <select
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      required={bookingMode === 'new'}
                      className="w-full appearance-none border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-gradient-to-r from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 backdrop-blur-sm text-gray-900 dark:text-white shadow-sm hover:shadow-md font-medium cursor-pointer"
                    >
                      <option value="">Select destination...</option>
                      {locations.filter(loc => loc.address).map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                      <option value="custom">Custom destination</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                  {destination === 'custom' && (
                    <input
                      type="text"
                      placeholder="Enter custom destination address"
                      value={customDestination}
                      onChange={(e) => setCustomDestination(e.target.value)}
                      required={destination === 'custom'}
                      className="w-full mt-2 border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm hover:shadow-md"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    Maximum Passengers
                  </label>
                  <input
                    type="number"
                    value={maxPassengers}
                    onChange={(e) => setMaxPassengers(parseInt(e.target.value) || 4)}
                    min="1"
                    max="8"
                    className="w-full border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm hover:shadow-md"
                  />
                </div>
              </div>
            )}

            {/* User Selection */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border-2 border-green-200 dark:border-green-600 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-200 mb-4 flex items-center">
                <span className="mr-2">👤</span>
                User & Passenger Selection
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                    Select User *
                  </label>
                  <div className="relative">
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      required
                      className="w-full appearance-none border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-gradient-to-r from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 backdrop-blur-sm text-gray-900 dark:text-white shadow-sm hover:shadow-md font-medium cursor-pointer"
                    >
                      <option value="">Choose a user...</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Rider Selection (Optional) */}
                {riders.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                      Select Rider (Optional)
                    </label>
                    <div className="relative">
                      <select
                        value={selectedRiderId}
                        onChange={(e) => setSelectedRiderId(e.target.value)}
                        className="w-full appearance-none border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-200 bg-gradient-to-r from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 backdrop-blur-sm text-gray-900 dark:text-white shadow-sm hover:shadow-md font-medium cursor-pointer"
                      >
                        <option value="">Book for user (no specific rider)</option>
                        {riders.map(rider => (
                          <option key={rider.id} value={rider.id}>
                            {rider.name} {rider.phone && `(${rider.phone})`}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pickup Location */}
            <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/30 dark:to-red-900/30 border-2 border-orange-200 dark:border-orange-600 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-orange-900 dark:text-orange-200 mb-4 flex items-center">
                <span className="mr-2">📍</span>
                Pickup Location *
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <label className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    !useCustomPickup 
                      ? 'border-orange-500 bg-orange-100 dark:bg-orange-800/30' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-orange-300'
                  }`}>
                    <input
                      type="radio"
                      id="existing-pickup"
                      checked={!useCustomPickup}
                      onChange={() => setUseCustomPickup(false)}
                      className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <div className="font-medium text-orange-800 dark:text-orange-200">Existing Location</div>
                      <div className="text-xs text-orange-600 dark:text-orange-400">Choose from predefined locations</div>
                    </div>
                  </label>
                  
                  <label className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    useCustomPickup 
                      ? 'border-orange-500 bg-orange-100 dark:bg-orange-800/30' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-orange-300'
                  }`}>
                    <input
                      type="radio"
                      id="custom-pickup"
                      checked={useCustomPickup}
                      onChange={() => setUseCustomPickup(true)}
                      className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                    />
                    <div>
                      <div className="font-medium text-orange-800 dark:text-orange-200">Custom Address</div>
                      <div className="text-xs text-orange-600 dark:text-orange-400">Enter a specific address</div>
                    </div>
                  </label>
                </div>
                
                {!useCustomPickup && (
                  <div className="relative">
                    <select
                      value={pickupLocationId}
                      onChange={(e) => setPickupLocationId(e.target.value)}
                      required={!useCustomPickup}
                      className="w-full appearance-none border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-gradient-to-r from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 backdrop-blur-sm text-gray-900 dark:text-white shadow-sm hover:shadow-md font-medium cursor-pointer"
                    >
                      <option value="">Choose pickup location...</option>
                      {locations.map(location => (
                        <option key={location.id} value={location.id}>
                          {location.name} - {location.address}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                )}
                
                {useCustomPickup && (
                  <input
                    type="text"
                    value={customPickupAddress}
                    onChange={(e) => setCustomPickupAddress(e.target.value)}
                    placeholder="Enter pickup address..."
                    required={useCustomPickup}
                    className="w-full border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm hover:shadow-md"
                  />
                )}
              </div>
            </div>

            {/* Dropoff Location */}
            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 border-2 border-teal-200 dark:border-teal-600 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-teal-900 dark:text-teal-200 mb-4 flex items-center">
                <span className="mr-2">🎯</span>
                Dropoff Location (Optional)
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <label className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    !useCustomDropoff 
                      ? 'border-teal-500 bg-teal-100 dark:bg-teal-800/30' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-teal-300'
                  }`}>
                    <input
                      type="radio"
                      id="existing-dropoff"
                      checked={!useCustomDropoff}
                      onChange={() => setUseCustomDropoff(false)}
                      className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                    />
                    <div>
                      <div className="font-medium text-teal-800 dark:text-teal-200">Standard Dropoff</div>
                      <div className="text-xs text-teal-600 dark:text-teal-400">Same as pickup or choose different location</div>
                    </div>
                  </label>
                  
                  <label className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                    useCustomDropoff 
                      ? 'border-teal-500 bg-teal-100 dark:bg-teal-800/30' 
                      : 'border-gray-200 dark:border-gray-600 hover:border-teal-300'
                  }`}>
                    <input
                      type="radio"
                      id="custom-dropoff"
                      checked={useCustomDropoff}
                      onChange={() => setUseCustomDropoff(true)}
                      className="w-4 h-4 text-teal-600 focus:ring-teal-500"
                    />
                    <div>
                      <div className="font-medium text-teal-800 dark:text-teal-200">Custom Dropoff</div>
                      <div className="text-xs text-teal-600 dark:text-teal-400">Enter specific dropoff address</div>
                    </div>
                  </label>
                </div>
                
                {!useCustomDropoff && (
                  <div className="relative">
                    <select
                      value={dropoffLocationId}
                      onChange={(e) => setDropoffLocationId(e.target.value)}
                      className="w-full appearance-none border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 pr-10 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200 bg-gradient-to-r from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 backdrop-blur-sm text-gray-900 dark:text-white shadow-sm hover:shadow-md font-medium cursor-pointer"
                    >
                      <option value="">Same as pickup location</option>
                      {locations.map(location => (
                        <option key={location.id} value={location.id}>
                          {location.name} - {location.address}
                        </option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg className="w-5 h-5 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                )}
                
                {useCustomDropoff && (
                  <input
                    type="text"
                    value={customDropoffAddress}
                    onChange={(e) => setCustomDropoffAddress(e.target.value)}
                    placeholder="Enter dropoff address..."
                    required={useCustomDropoff}
                    className="w-full border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm hover:shadow-md"
                  />
                )}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-b-2xl">
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-xl transition-all duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="admin-booking-form"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center space-x-2">
                  <span>{bookingMode === 'new' ? '🚐 Create Trip & Book' : '📝 Create Booking'}</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}