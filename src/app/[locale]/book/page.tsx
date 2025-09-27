'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
// Removed unused imports for cleaner build
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import CalendarIntegration from '@/components/CalendarIntegration'
import WeeklyCalendar from '@/components/WeeklyCalendar'
import NewTripModal from '@/components/NewTripModal'
import BookingModal from '@/components/BookingModal'
import { startOfWeek, format, addMinutes } from 'date-fns'
import { getUserDisplayName } from '@/lib/utils'
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

interface Location {
  id: string
  name: string
  address: string
  isFrequent: boolean
  defaultDuration?: number
  baseCost?: number
}

interface Rider {
  id: string
  name: string
  phone: string | null
  relationship: string | null
}

export default function BookTrip() {
  const { data: session, status } = useSession()
  const [selectedWeekStart, setSelectedWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 })) // Monday start
  const [trips, setTrips] = useState<Trip[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [riders, setRiders] = useState<Rider[]>([])
  const [userCredits, setUserCredits] = useState(0)
  const [lastBookingId, setLastBookingId] = useState<string | null>(null)
  const [creditPackages, setCreditPackages] = useState<any[]>([])
  const [showCreditModal, setShowCreditModal] = useState(false)
  const [showCalendarIntegration, setShowCalendarIntegration] = useState(false)
  const [showNewTripModal, setShowNewTripModal] = useState(false)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ date: Date; time: string } | null>(null)


  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      redirect('/auth/signin')
    }
  }, [session, status])

  useEffect(() => {
    fetchTrips()
    fetchLocations()
    fetchUserCredits()
    fetchRiders()
    fetchCreditPackages()
  }, [selectedWeekStart])

  const fetchTrips = async () => {
    try {
      // Fetch trips for the entire week
      const startDate = format(selectedWeekStart, 'yyyy-MM-dd')
      const response = await fetch(`/api/trips?week=${startDate}`)
      if (response.ok) {
        const data = await response.json()
        setTrips(data)
      }
    } catch (error) {
      console.error('Error fetching trips:', error)
    }
  }

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

  const fetchUserCredits = async () => {
    try {
      const response = await fetch('/api/user/credits')
      if (response.ok) {
        const data = await response.json()
        setUserCredits(data.credits)
      }
    } catch (error) {
      console.error('Error fetching user credits:', error)
    }
  }

  const fetchRiders = async () => {
    try {
      const response = await fetch('/api/user/riders')
      if (response.ok) {
        const data = await response.json()
        setRiders(data)
        // Riders loaded successfully
      }
    } catch (error) {
      console.error('Error fetching riders:', error)
    }
  }

  const handleTripClick = (trip: Trip) => {
    setSelectedTrip(trip)
    setShowBookingModal(true)
  }

  const handleBookingSuccess = () => {
    // Refresh data after successful booking
    fetchTrips()
    fetchUserCredits()
    setSelectedTrip(null)
  }


  const fetchCreditPackages = async () => {
    try {
      const response = await fetch('/api/user/credit-packages')
      if (response.ok) {
        const data = await response.json()
        setCreditPackages(data)
      }
    } catch (error) {
      console.error('Error fetching credit packages:', error)
    }
  }

  const purchasePackage = async (packageId: string) => {
    try {
      const response = await fetch('/api/user/purchase-package', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packageId }),
      })

      if (response.ok) {
        const data = await response.json()
        setUserCredits(data.totalCredits)
        toast.success(`💳 ${data.message}`, {
          duration: 4000,
          style: {
            background: 'linear-gradient(135deg, #059669, #047857)',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            boxShadow: '0 10px 25px rgba(5, 150, 105, 0.3)',
          },
          icon: '💰',
        })
        setShowCreditModal(false)
      } else {
        const errorData = await response.json()
        toast.error(`Failed to purchase package: ${errorData.error}`, {
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
      console.error('Error purchasing package:', error)
      toast.error('Error purchasing package', {
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
  }


  const handleTimeSlotClick = (date: Date, time: string) => {
    // Check if there's already a trip at this time slot
    const timeSlotDateTime = new Date(date);
    const [hours, minutes] = time.split(':').map(Number);
    timeSlotDateTime.setHours(hours, minutes, 0, 0);
    
    const existingTrip = trips.find(trip => {
      const tripStart = new Date(trip.startTime);
      return Math.abs(tripStart.getTime() - timeSlotDateTime.getTime()) < 60000; // Within 1 minute
    });

    if (existingTrip) {
      // If there's an existing trip, show it for booking (if not full)
      const currentPassengers = existingTrip.currentPassengers || 0;
      if (currentPassengers >= existingTrip.maxPassengers) {
        toast.error(`This ${time} time slot is full (${existingTrip.destination.name}). No more passengers can be added.`, {
          duration: 5000,
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
        });
        return;
      } else {
        // Show existing trip for booking
        handleTripClick(existingTrip);
        return;
      }
    }

    // No existing trip, allow creating new one
    setSelectedTimeSlot({ date, time });
    setShowNewTripModal(true);
  }

  const handleCreateTrip = async (tripData: {
    destination: string;
    customDestination?: string;
    pickupAddress: string;
    riderIds: string[];
    guestRiders: Array<{id: string; name: string; phone?: string}>;
  }) => {
    if (!selectedTimeSlot) return;

    try {
      // Parse the time slot to create start time
      const [hours, minutes] = selectedTimeSlot.time.split(':').map(Number);
      const startTime = new Date(selectedTimeSlot.date);
      startTime.setHours(hours, minutes, 0, 0);

      const requestBody: any = {
        startTime: startTime.toISOString(),
        maxPassengers: 4,
      }

      // Check if destination has default duration (don't send endTime if it does)
      let hasDefaultDuration = false
      if (tripData.destination !== 'custom') {
        const destination = locations.find(loc => loc.id === tripData.destination)
        hasDefaultDuration = !!destination?.defaultDuration
      }

      // Only send endTime for destinations without default duration
      if (!hasDefaultDuration) {
        const endTime = addMinutes(startTime, 20);
        requestBody.endTime = endTime.toISOString()
      }

      if (tripData.destination === 'custom') {
        requestBody.customDestination = tripData.customDestination
      } else {
        requestBody.destinationId = tripData.destination
      }

      // Create the trip first
      const tripResponse = await fetch('/api/admin/trips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!tripResponse.ok) {
        const errorData = await tripResponse.json();
        throw new Error(errorData.error || 'Failed to create trip');
      }

      const newTrip = await tripResponse.json();

      // Create bookings for all selected riders (family members and guests)
      const allBookings = [];
      
      // Create bookings for family members and account holder
      for (const riderId of tripData.riderIds) {
        const bookingResponse = await fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tripId: newTrip.id,
            pickupLocation: tripData.pickupAddress,
            dropoffLocation: tripData.destination === 'custom' ? tripData.customDestination : tripData.destination,
            riderId: riderId || null,
          }),
        });
        
        if (bookingResponse.ok) {
          const booking = await bookingResponse.json();
          allBookings.push(booking);
        } else {
          const errorData = await bookingResponse.json();
          throw new Error(`Failed to create booking for rider: ${errorData.error}`);
        }
      }
      
      // Create bookings for guest riders
      for (const guest of tripData.guestRiders) {
        const bookingResponse = await fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tripId: newTrip.id,
            pickupLocation: tripData.pickupAddress,
            dropoffLocation: tripData.destination === 'custom' ? tripData.customDestination : tripData.destination,
            riderId: null,
            guestName: guest.name,
            guestPhone: guest.phone,
          }),
        });
        
        if (bookingResponse.ok) {
          const booking = await bookingResponse.json();
          allBookings.push(booking);
        } else {
          const errorData = await bookingResponse.json();
          throw new Error(`Failed to create booking for guest ${guest.name}: ${errorData.error}`);
        }
      }

      if (allBookings.length > 0) {
        setLastBookingId(allBookings[0].id);
        setShowCalendarIntegration(true);
        toast.success(`🚐 Trip created with ${allBookings.length} booking${allBookings.length > 1 ? 's' : ''}!`, {
          duration: 5000,
          style: {
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            boxShadow: '0 10px 25px rgba(99, 102, 241, 0.3)',
          },
          icon: '🎯',
        });
        
        // Refresh data
        fetchTrips();
        fetchUserCredits();
      } else {
        toast.error('Failed to create any bookings', {
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
        });
      }
    } catch (error) {
      console.error('Error creating trip:', error);
      toast.error(error instanceof Error ? error.message : 'Error creating trip', {
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
      });
    }
  }

  if (status === 'loading') {
    return <div className="p-8">Loading...</div>
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
                href="/profile"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors duration-200 font-medium"
              >
                Profile
              </Link>
              <Link
                href="/"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors duration-200 font-medium"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-full mx-auto p-6">
        <div className="mb-6">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Book Your Journey</h1>
            <p className="text-base text-gray-600 dark:text-gray-300">Select your trip and enjoy premium shuttle service</p>
          </div>
          
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-lg p-4 border border-gray-200/50 dark:border-gray-700/50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-bold">💳</span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {session?.user.role === 'ADMIN' ? 'Admin Credits' : 'Available Credits'}
                    </p>
                    <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      {session?.user.role === 'ADMIN' ? '∞ Unlimited' : userCredits}
                    </p>
                  </div>
                </div>
              </div>
              {session?.user.role !== 'ADMIN' && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowCreditModal(true)}
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-1.5 rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg"
                  >
                    Buy Credits
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Weekly Calendar Trip Selection */}
        <div className="mb-6">
          <WeeklyCalendar
            trips={trips}
            selectedWeekStart={selectedWeekStart}
            onWeekChange={setSelectedWeekStart}
            onTimeSlotClick={handleTimeSlotClick}
            onTripClick={handleTripClick}
          />
        </div>

        {/* Simple instructions */}
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white text-2xl">🚐</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Ready to Book?</h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-md mx-auto">
            Click on any available trip in the calendar above to start booking your shuttle ride.
          </p>
        </div>

        {/* Calendar Integration Modal */}
        {showCalendarIntegration && lastBookingId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full">
              <CalendarIntegration
                bookingId={lastBookingId}
                onSuccess={() => {
                  setShowCalendarIntegration(false)
                  setLastBookingId(null)
                  toast.success('📅 Calendar event created successfully!', {
                    duration: 4000,
                    style: {
                      background: 'linear-gradient(135deg, #059669, #047857)',
                      color: 'white',
                      padding: '16px 20px',
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: '600',
                      boxShadow: '0 10px 25px rgba(5, 150, 105, 0.3)',
                    },
                    icon: '📆',
                  })
                }}
                onError={(error) => {
                  toast.error(`Failed to create calendar event: ${error}`, {
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
                }}
              />
              <div className="mt-4 text-center">
                <button
                  onClick={() => {
                    setShowCalendarIntegration(false)
                    setLastBookingId(null)
                  }}
                  className="text-white hover:text-gray-200 underline"
                >
                  Skip calendar integration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Booking Modal */}
        <BookingModal
          isOpen={showBookingModal}
          onClose={() => {
            setShowBookingModal(false)
            setSelectedTrip(null)
          }}
          trip={selectedTrip}
          riders={riders}
          userCredits={userCredits}
          onBookingSuccess={handleBookingSuccess}
        />

        {/* New Trip Modal */}
        {showNewTripModal && selectedTimeSlot && (
          <NewTripModal
            isOpen={showNewTripModal}
            onClose={() => {
              setShowNewTripModal(false);
              setSelectedTimeSlot(null);
            }}
            selectedDate={selectedTimeSlot.date}
            selectedTime={selectedTimeSlot.time}
            locations={locations}
            riders={riders}
            onCreateTrip={handleCreateTrip}
          />
        )}

        {/* Credit Packages Modal */}
        {showCreditModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Buy Credits</h3>
                  <button
                    onClick={() => setShowCreditModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {creditPackages.map((pkg) => (
                    <div key={pkg.id} className={`border-2 rounded-xl p-6 transition-all duration-200 hover:shadow-lg ${
                      pkg.isPopular 
                        ? 'border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30' 
                        : 'border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50'
                    }`}>
                      {pkg.isPopular && (
                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-3">
                          🔥 MOST POPULAR
                        </div>
                      )}
                      
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{pkg.name}</h3>
                      
                      <div className="text-center mb-4">
                        <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                          {pkg.credits} Credits
                        </div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                          R{pkg.price.toFixed(2)}
                        </div>
                        {pkg.savings > 0 && (
                          <div className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">
                            Save R{pkg.savings.toFixed(2)} ({pkg.savingsPercentage}% off)
                          </div>
                        )}
                      </div>

                      <div className="text-center text-sm text-gray-600 dark:text-gray-300 mb-4">
                        R{pkg.pricePerCredit.toFixed(2)} per credit
                        {pkg.regularPrice > pkg.price && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 line-through">
                            Regular: R{pkg.regularPrice.toFixed(2)}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => purchasePackage(pkg.id)}
                        className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                          pkg.isPopular
                            ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600'
                            : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700'
                        }`}
                      >
                        Purchase Package
                      </button>
                    </div>
                  ))}
                </div>

                {creditPackages.length === 0 && (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">💳</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No credit packages available</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">Contact support to set up credit packages</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}