'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

interface Trip {
  id: string
  destination: {
    id: string
    name: string
    address: string
  }
  startTime: string
  endTime: string
  maxPassengers: number
  currentPassengers: number
  status: string
}

interface Rider {
  id: string
  name: string
  phone: string | null
  relationship: string | null
}

interface BookingModalProps {
  isOpen: boolean
  onClose: () => void
  trip: Trip | null
  riders: Rider[]
  userCredits: number
  onBookingSuccess: () => void
}

export default function BookingModal({
  isOpen,
  onClose,
  trip,
  riders,
  userCredits,
  onBookingSuccess
}: BookingModalProps) {
  const { data: session } = useSession()
  const [customPickup, setCustomPickup] = useState('')
  const [pickupConfirmed, setPickupConfirmed] = useState(false)
  const [selectedRiders, setSelectedRiders] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [existingBookings, setExistingBookings] = useState<string[]>([])

  // Reset form when modal opens/closes or trip changes
  useEffect(() => {
    if (isOpen && trip) {
      setCustomPickup('')
      setPickupConfirmed(false)
      setSelectedRiders([])
      fetchExistingBookings()
    }
  }, [isOpen, trip])

  // Fetch existing bookings for this trip and user
  const fetchExistingBookings = async () => {
    if (!trip) return

    try {
      const response = await fetch(`/api/user/bookings?tripId=${trip.id}`)
      if (response.ok) {
        const bookings = await response.json()
        // Extract rider IDs from existing bookings (null represents account holder)
        const bookedRiderIds = bookings.map((booking: { riderId: string | null }) => booking.riderId || '')
        setExistingBookings(bookedRiderIds)
      }
    } catch (error) {
      console.error('Error fetching existing bookings:', error)
    }
  }

  const toggleRiderSelection = (riderId: string) => {
    setSelectedRiders(prev => {
      const maxCapacity = trip ? trip.maxPassengers - trip.currentPassengers + existingBookings.length : 4
      
      if (prev.includes(riderId)) {
        return prev.filter(id => id !== riderId)
      } else if (prev.length < maxCapacity) {
        return [...prev, riderId]
      } else {
        toast.error('Trip is at maximum capacity', {
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
        return prev
      }
    })
  }

  const toggleAccountHolderSelection = () => {
    setSelectedRiders(prev => {
      const maxCapacity = trip ? trip.maxPassengers - trip.currentPassengers + existingBookings.length : 4
      
      if (prev.includes('')) {
        return prev.filter(id => id !== '')
      } else if (prev.length < maxCapacity) {
        return [...prev, '']
      } else {
        toast.error('Trip is at maximum capacity', {
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
        return prev
      }
    })
  }

  const handleBooking = async () => {
    if (!trip) return

    if (!pickupConfirmed || !customPickup.trim()) {
      toast.error('Please enter and confirm your pickup address', {
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

    if (selectedRiders.length === 0) {
      toast.error('Please select at least one rider', {
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

    if (session?.user?.role !== 'ADMIN' && userCredits < selectedRiders.length) {
      toast.error('Insufficient credits. Please purchase more credits.', {
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
        icon: '💳',
      })
      return
    }

    setLoading(true)

    try {
      const bookingPromises = selectedRiders.map(riderId => 
        fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tripId: trip.id,
            pickupLocation: customPickup.trim(),
            dropoffLocation: trip.destination.id,
            riderId: riderId || null,
          }),
        })
      )

      const responses = await Promise.all(bookingPromises)

      // Check if all bookings succeeded
      const failedBookings = responses.filter(response => !response.ok)
      
      if (failedBookings.length === 0) {
        toast.success(`🎉 Booking confirmed for ${selectedRiders.length} rider(s)!`, {
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
          icon: '✈️',
        })
        onBookingSuccess()
        onClose()
      } else {
        const errorData = await failedBookings[0].json()
        toast.error(`Booking failed: ${errorData.error}`, {
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
      console.error('Error creating booking:', error)
      toast.error('Error creating booking', {
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

  if (!isOpen || !trip) return null

  const availableSeats = trip.maxPassengers - trip.currentPassengers
  const totalBookableRiders = availableSeats + existingBookings.length

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Book Your Trip</h2>
              <p className="text-sm text-white/80">{trip.destination.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Trip Details */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-2 border-indigo-200 dark:border-indigo-600 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-6 h-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xs">🎯</span>
              </div>
              <h3 className="font-bold text-indigo-900 dark:text-indigo-200 text-base">Trip Details</h3>
            </div>
            <div className="space-y-2">
              <p className="font-semibold text-indigo-800 dark:text-indigo-300">{trip.destination.name}</p>
              <p className="text-xs text-indigo-700 dark:text-indigo-400">{trip.destination.address}</p>
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 bg-indigo-200 dark:bg-indigo-700 text-indigo-800 dark:text-indigo-200 text-sm font-medium rounded-full">
                  {new Date(trip.startTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })} - {new Date(trip.endTime).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <p className="text-xs text-indigo-600 dark:text-indigo-400">
                {availableSeats} seat{availableSeats !== 1 ? 's' : ''} available
              </p>
            </div>
          </div>

          {/* Pickup Address */}
          {!pickupConfirmed ? (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Pickup Address <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Enter your pickup street address"
                  value={customPickup}
                  onChange={(e) => setCustomPickup(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white text-sm"
                />
                {customPickup.trim() && (
                  <button
                    onClick={() => setPickupConfirmed(true)}
                    className="w-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 py-2 px-3 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors text-sm font-medium"
                  >
                    Confirm Address
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                e.g., &quot;123 Main Street, Stellenbosch&quot;
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">Pickup Address</p>
                  <p className="text-sm text-gray-900 dark:text-white">{customPickup}</p>
                </div>
                <button
                  onClick={() => setPickupConfirmed(false)}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-xs font-medium"
                >
                  Change
                </button>
              </div>
            </div>
          )}

          {/* Rider Selection */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-2 border-purple-200 dark:border-purple-600 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-white text-xs font-bold">👥</span>
                </div>
                <h4 className="font-semibold text-purple-900 dark:text-purple-200 text-sm">Trip Riders</h4>
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400">
                {selectedRiders.length}/{totalBookableRiders} available
              </div>
            </div>

            {/* Selected Riders */}
            {selectedRiders.length > 0 && (
              <div className="space-y-2 mb-3">
                {selectedRiders.map(riderId => {
                  const rider = riderId === '' ? null : riders.find(r => r.id === riderId)
                  const riderName = rider ? rider.name : (session?.user?.name || 'You')
                  const riderInfo = rider ? `${rider.relationship}${rider.phone ? ` • ${rider.phone}` : ''}` : 'Account holder'
                  
                  return (
                    <div key={riderId || 'account-holder'} className="bg-white/70 dark:bg-gray-700/70 border border-purple-200 dark:border-purple-600 rounded-lg p-2 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-purple-900 dark:text-purple-100 text-sm">{riderName}</div>
                        <div className="text-xs text-purple-600 dark:text-purple-400">{riderInfo}</div>
                      </div>
                      <button
                        onClick={() => riderId === '' ? toggleAccountHolderSelection() : toggleRiderSelection(riderId)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add Rider Buttons */}
            {selectedRiders.length < totalBookableRiders && (
              <div className="space-y-2">
                <p className="text-xs text-purple-700 dark:text-purple-300 mb-2">
                  Add riders to this trip:
                </p>
                
                {/* Add Account Holder */}
                {!selectedRiders.includes('') && !existingBookings.includes('') && (
                  <button
                    onClick={() => toggleAccountHolderSelection()}
                    className="w-full flex items-center space-x-3 p-2 rounded-lg border-2 border-dashed border-purple-300 dark:border-purple-600 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200"
                  >
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-700 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 dark:text-purple-300 font-bold text-lg">+</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-purple-800 dark:text-purple-200 text-sm">
                        {session?.user?.name || 'You'}
                      </div>
                      <div className="text-xs text-purple-600 dark:text-purple-400">Account holder</div>
                    </div>
                  </button>
                )}

                {/* Show already booked account holder */}
                {existingBookings.includes('') && (
                  <div className="w-full flex items-center space-x-3 p-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 opacity-60">
                    <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 dark:text-gray-400 font-bold text-lg">✓</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-700 dark:text-gray-300 text-sm">
                        {session?.user?.name || 'You'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Already booked for this trip</div>
                    </div>
                  </div>
                )}

                {/* Add Family Members */}
                {riders.filter(rider => !selectedRiders.includes(rider.id) && !existingBookings.includes(rider.id)).map(rider => (
                  <button
                    key={rider.id}
                    onClick={() => toggleRiderSelection(rider.id)}
                    className="w-full flex items-center space-x-3 p-2 rounded-lg border-2 border-dashed border-purple-300 dark:border-purple-600 hover:border-purple-400 dark:hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200"
                  >
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-700 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 dark:text-purple-300 font-bold text-lg">+</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-purple-800 dark:text-purple-200 text-sm">{rider.name}</div>
                      <div className="text-xs text-purple-600 dark:text-purple-400">
                        {rider.relationship}{rider.phone ? ` • ${rider.phone}` : ''}
                      </div>
                    </div>
                  </button>
                ))}

                {/* Show already booked family members */}
                {riders.filter(rider => existingBookings.includes(rider.id)).map(rider => (
                  <div
                    key={rider.id}
                    className="w-full flex items-center space-x-3 p-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 opacity-60"
                  >
                    <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                      <span className="text-gray-600 dark:text-gray-400 font-bold text-lg">✓</span>
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-gray-700 dark:text-gray-300 text-sm">{rider.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Already booked for this trip</div>
                    </div>
                  </div>
                ))}

                {riders.length === 0 && selectedRiders.length === 0 && (
                  <div className="text-center py-3">
                    <p className="text-xs text-purple-500 dark:text-purple-500">
                      Add family members in your profile to book rides for them
                    </p>
                  </div>
                )}
              </div>
            )}

            {selectedRiders.length >= totalBookableRiders && (
              <div className="text-center py-2">
                <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                  🚐 Trip at maximum capacity
                </p>
              </div>
            )}
          </div>

          {/* Trip Summary */}
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border-2 border-emerald-200 dark:border-emerald-600 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-emerald-900 dark:text-emerald-200 text-sm">Trip Summary</h4>
              <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">💰</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-emerald-700 dark:text-emerald-300">Cost per rider:</span>
                <span className="font-semibold text-emerald-800 dark:text-emerald-200">1 credit</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-emerald-700 dark:text-emerald-300">Selected riders:</span>
                <span className="font-semibold text-emerald-800 dark:text-emerald-200">{selectedRiders.length}</span>
              </div>
              <hr className="border-emerald-200 dark:border-emerald-600" />
              <div className="flex justify-between">
                <span className="font-bold text-emerald-800 dark:text-emerald-200 text-sm">Total Cost:</span>
                <span className="font-bold text-emerald-800 dark:text-emerald-200 text-base">{selectedRiders.length} credits</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-emerald-700 dark:text-emerald-300">Remaining credits:</span>
                <span className={`font-semibold ${
                  session?.user?.role === 'ADMIN' ? 'text-emerald-800 dark:text-emerald-200' : 
                  userCredits - selectedRiders.length >= 0 ? 'text-emerald-800 dark:text-emerald-200' : 'text-red-600 dark:text-red-400'
                }`}>
                  {session?.user?.role === 'ADMIN' ? '∞ Unlimited' : userCredits - selectedRiders.length}
                </span>
              </div>
            </div>
          </div>

          {/* Insufficient Credits Warning */}
          {session?.user?.role !== 'ADMIN' && userCredits < selectedRiders.length && selectedRiders.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-600 rounded-lg p-3 text-center">
              <p className="text-red-600 dark:text-red-400 font-medium text-sm">
                ⚠️ Insufficient Credits
              </p>
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                You need {selectedRiders.length - userCredits} more credits to book this trip
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-3 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleBooking}
              disabled={loading || (session?.user?.role !== 'ADMIN' && userCredits < selectedRiders.length) || selectedRiders.length === 0 || !pickupConfirmed}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 px-4 rounded-lg hover:from-emerald-600 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-md hover:shadow-lg transform hover:-translate-y-0.5 disabled:hover:transform-none"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span className="text-sm">Processing...</span>
                </div>
              ) : (
                <span>Confirm Booking</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}