'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'
import AdminBookingModal from '@/components/admin/AdminBookingModal'

interface Booking {
  id: string
  status: string
  passengerCount: number
  creditsCost: number
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
  rider: {
    id: string
    name: string
  } | null
  trip: {
    id: string
    startTime: string
    endTime: string
    status: string
    destination: {
      name: string
      address: string
    }
  }
  pickupLocation: {
    name: string
    address: string
  }
  dropoffLocation: {
    name: string
    address: string
  }
}

export default function BookingAdministration() {
  const { data: session, status } = useSession()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedDate, setSelectedDate] = useState('')
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [showAdminBookingModal, setShowAdminBookingModal] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      redirect('/auth/signin')
    }
  }, [session, status])

  useEffect(() => {
    fetchBookings()
  }, [])

  useEffect(() => {
    filterBookings()
  }, [bookings, searchTerm, selectedStatus, selectedDate])

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/admin/bookings')
      if (response.ok) {
        const data = await response.json()
        setBookings(data)
      }
    } catch (error) {
      console.error('Error fetching bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterBookings = () => {
    let filtered = bookings

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(booking => 
        booking.user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.trip.destination.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.rider?.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(booking => booking.status === selectedStatus)
    }

    // Filter by date
    if (selectedDate) {
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.trip.startTime).toISOString().split('T')[0]
        return bookingDate === selectedDate
      })
    }

    setFilteredBookings(filtered)
  }

  const openBookingModal = (booking: Booking) => {
    setSelectedBooking(booking)
    setShowBookingModal(true)
  }

  const closeBookingModal = () => {
    setSelectedBooking(null)
    setShowBookingModal(false)
  }

  const cancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking? Credits will be refunded.')) return

    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/cancel`, {
        method: 'POST',
      })

      if (response.ok) {
        alert('Booking cancelled and credits refunded successfully')
        fetchBookings()
        closeBookingModal()
      } else {
        const errorData = await response.json()
        alert(`Failed to cancel booking: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error cancelling booking:', error)
      alert('Error cancelling booking')
    }
  }

  const addWalkInBooking = () => {
    setShowAdminBookingModal(true)
  }

  if (status === 'loading' || loading) {
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Booking Administration
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Manage and monitor all shuttle bookings
              </p>
            </div>
            <button
              onClick={addWalkInBooking}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
            >
              Add Walk-in Booking
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Search Bookings
              </label>
              <input
                type="text"
                placeholder="Search by user, destination, or rider..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white"
              >
                <option value="all">All Statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Trip Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white"
              />
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Showing {filteredBookings.length} of {bookings.length} bookings
            </p>
            <div className="flex space-x-2">
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm rounded-full">
                {bookings.filter(b => b.status === 'CONFIRMED').length} Confirmed
              </span>
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm rounded-full">
                {bookings.filter(b => b.status === 'COMPLETED').length} Completed
              </span>
              <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-sm rounded-full">
                {bookings.filter(b => b.status === 'CANCELLED').length} Cancelled
              </span>
            </div>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Booking Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Trip
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Passenger
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          Booking #{booking.id.slice(-8)}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {booking.creditsCost} credits • {new Date(booking.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          {booking.user.name || booking.user.email}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {booking.trip.destination.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(booking.trip.startTime).toLocaleDateString()} • {new Date(booking.trip.startTime).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          From: {booking.pickupLocation.address}
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {booking.rider ? booking.rider.name : (booking.user.name || 'Account holder')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {booking.rider ? 'Family member' : 'Account holder'}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                        booking.status === 'CONFIRMED' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                        booking.status === 'COMPLETED' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                        'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                      }`}>
                        {booking.status}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openBookingModal(booking)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                        >
                          View
                        </button>
                        {booking.status === 'CONFIRMED' && (
                          <button
                            onClick={() => cancelBooking(booking.id)}
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredBookings.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📋</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No bookings found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Try adjusting your search criteria</p>
            </div>
          )}
        </div>

        {/* Admin Booking Creation Modal */}
        <AdminBookingModal
          isOpen={showAdminBookingModal}
          onClose={() => setShowAdminBookingModal(false)}
          onBookingCreated={() => {
            fetchBookings()
            setShowAdminBookingModal(false)
          }}
        />

        {/* Booking Details Modal */}
        {showBookingModal && selectedBooking && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Booking Details
                  </h3>
                  <button
                    onClick={closeBookingModal}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-6">
                  {/* Booking Info */}
                  <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-4">
                    <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-3">Booking Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-blue-700 dark:text-blue-300 font-medium">Booking ID:</span>
                        <p className="text-blue-900 dark:text-blue-100">{selectedBooking.id}</p>
                      </div>
                      <div>
                        <span className="text-blue-700 dark:text-blue-300 font-medium">Status:</span>
                        <p className="text-blue-900 dark:text-blue-100">{selectedBooking.status}</p>
                      </div>
                      <div>
                        <span className="text-blue-700 dark:text-blue-300 font-medium">Credits Cost:</span>
                        <p className="text-blue-900 dark:text-blue-100">{selectedBooking.creditsCost}</p>
                      </div>
                      <div>
                        <span className="text-blue-700 dark:text-blue-300 font-medium">Booked:</span>
                        <p className="text-blue-900 dark:text-blue-100">{new Date(selectedBooking.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Trip Info */}
                  <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-4">
                    <h4 className="font-semibold text-green-900 dark:text-green-200 mb-3">Trip Information</h4>
                    <div className="text-sm space-y-2">
                      <div>
                        <span className="text-green-700 dark:text-green-300 font-medium">Destination:</span>
                        <p className="text-green-900 dark:text-green-100">{selectedBooking.trip.destination.name}</p>
                        <p className="text-green-700 dark:text-green-400 text-xs">{selectedBooking.trip.destination.address}</p>
                      </div>
                      <div>
                        <span className="text-green-700 dark:text-green-300 font-medium">Date & Time:</span>
                        <p className="text-green-900 dark:text-green-100">
                          {new Date(selectedBooking.trip.startTime).toLocaleDateString()} • {new Date(selectedBooking.trip.startTime).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })} - {new Date(selectedBooking.trip.endTime).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div>
                        <span className="text-green-700 dark:text-green-300 font-medium">Pickup:</span>
                        <p className="text-green-900 dark:text-green-100">{selectedBooking.pickupLocation.address}</p>
                      </div>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-4">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-200 mb-3">Customer Information</h4>
                    <div className="text-sm space-y-2">
                      <div>
                        <span className="text-purple-700 dark:text-purple-300 font-medium">Account Holder:</span>
                        <p className="text-purple-900 dark:text-purple-100">{selectedBooking.user.name || 'No name'}</p>
                        <p className="text-purple-700 dark:text-purple-400 text-xs">{selectedBooking.user.email}</p>
                      </div>
                      <div>
                        <span className="text-purple-700 dark:text-purple-300 font-medium">Passenger:</span>
                        <p className="text-purple-900 dark:text-purple-100">
                          {selectedBooking.rider ? selectedBooking.rider.name : (selectedBooking.user.name || 'Account holder')}
                        </p>
                        <p className="text-purple-700 dark:text-purple-400 text-xs">
                          {selectedBooking.rider ? 'Family member' : 'Account holder'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={closeBookingModal}
                    className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    Close
                  </button>
                  {selectedBooking.status === 'CONFIRMED' && (
                    <button
                      onClick={() => cancelBooking(selectedBooking.id)}
                      className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Cancel Booking
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}