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

interface City {
  id: string
  name: string
  areas: Area[]
}

interface Area {
  id: string
  name: string
  driverCount?: number
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

  // City/Area selection state
  const [cities, setCities] = useState<City[]>([])
  const [selectedCityId, setSelectedCityId] = useState<string>('')
  const [selectedAreaId, setSelectedAreaId] = useState<string>('')
  const [loadingCities, setLoadingCities] = useState(true)
  const [showCitySelection, setShowCitySelection] = useState(true)


  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      redirect('/auth/signin')
    }
  }, [session, status])

  useEffect(() => {
    fetchCities()
  }, [])

  useEffect(() => {
    if (selectedCityId && selectedAreaId) {
      fetchTrips()
      fetchLocations()
      fetchUserCredits()
      fetchRiders()
      fetchCreditPackages()
    }
  }, [selectedWeekStart, selectedCityId, selectedAreaId])

  const fetchCities = async () => {
    try {
      const response = await fetch('/api/cities?includeAreas=true')
      if (response.ok) {
        const data = await response.json()
        setCities(data.cities || [])

        // Auto-select if only one city exists
        if (data.cities && data.cities.length === 1) {
          setSelectedCityId(data.cities[0].id)
          if (data.cities[0].areas && data.cities[0].areas.length === 1) {
            setSelectedAreaId(data.cities[0].areas[0].id)
            setShowCitySelection(false)
          }
        }
      }
    } catch (error) {
      console.error('Error fetching cities:', error)
    } finally {
      setLoadingCities(false)
    }
  }

  const fetchTrips = async () => {
    try {
      // Fetch trips for the entire week
      const startDate = format(selectedWeekStart, 'yyyy-MM-dd')
      const response = await fetch(`/api/trips?week=${startDate}&cityId=${selectedCityId}&areaId=${selectedAreaId}`)
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
        cityId: selectedCityId,
        areaId: selectedAreaId,
        autoAssign: true, // Enable automatic driver assignment
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
              <span className="hidden md:inline text-gray-700 dark:text-gray-200 font-medium">
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
        {/* City/Area Selection */}
        {showCitySelection && (
          <div className="mb-8 max-w-4xl mx-auto">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-white text-3xl">📍</span>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Where are you traveling?
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  Select your city and service area to view available trips
                </p>
              </div>

              {loadingCities ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* City Selection */}
                  <div>
                    <label className="block text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">
                      Select City
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {cities.map((city) => (
                        <button
                          key={city.id}
                          onClick={() => {
                            setSelectedCityId(city.id)
                            setSelectedAreaId('') // Reset area when city changes
                          }}
                          className={`p-6 rounded-xl border-2 transition-all duration-200 text-left ${
                            selectedCityId === city.id
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-lg'
                              : 'border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 hover:border-indigo-300 hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                              {city.name}
                            </h3>
                            {selectedCityId === city.id && (
                              <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {city.areas.length} area{city.areas.length !== 1 ? 's' : ''} available
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Area Selection */}
                  {selectedCityId && (
                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                      <label className="block text-lg font-semibold text-gray-700 dark:text-gray-200 mb-3">
                        Select Service Area
                      </label>
                      {cities.find(c => c.id === selectedCityId)?.areas.length === 0 ? (
                        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl p-6 text-center">
                          <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                            No service areas available in this city yet.
                          </p>
                          <p className="text-sm text-yellow-600 dark:text-yellow-300 mt-2">
                            Please contact support or choose a different city.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {cities.find(c => c.id === selectedCityId)?.areas.map((area) => (
                            <button
                              key={area.id}
                              onClick={() => setSelectedAreaId(area.id)}
                              className={`p-5 rounded-xl border-2 transition-all duration-200 text-left ${
                                selectedAreaId === area.id
                                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/30 shadow-lg'
                                  : 'border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 hover:border-purple-300 hover:shadow-md'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <h4 className="font-bold text-gray-900 dark:text-white mb-1">
                                    {area.name}
                                  </h4>
                                  {area.driverCount !== undefined && (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      {area.driverCount} driver{area.driverCount !== 1 ? 's' : ''}
                                    </p>
                                  )}
                                </div>
                                {selectedAreaId === area.id && (
                                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 ml-2">
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Continue Button */}
                  {selectedCityId && selectedAreaId && (
                    <div className="pt-6">
                      <button
                        onClick={() => setShowCitySelection(false)}
                        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-purple-700 transform hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center space-x-2"
                      >
                        <span>Continue to Booking</span>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Only show booking interface if city/area selected */}
        {!showCitySelection && selectedCityId && selectedAreaId && (
          <>
            <div className="mb-6">
              <div className="text-center mb-6">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Book Your Journey</h1>
                <p className="text-base text-gray-600 dark:text-gray-300">Select your drop off time and enjoy premium shuttle service</p>

                {/* Show selected city/area */}
                <div className="mt-4 flex items-center justify-center space-x-2">
                  <div className="inline-flex items-center bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-4 py-2 rounded-lg font-medium">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {cities.find(c => c.id === selectedCityId)?.name} • {cities.find(c => c.id === selectedCityId)?.areas.find(a => a.id === selectedAreaId)?.name}
                  </div>
                  <button
                    onClick={() => setShowCitySelection(true)}
                    className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 underline"
                  >
                    Change
                  </button>
                </div>
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

        {/* Simple instructions - Hidden on Mobile */}
        <div className="hidden md:block text-center py-8">
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
                              R{pkg.price.toFixed(0)}
                            </div>
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
          </>
        )}
      </div>
    </div>
  )
}