'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import toast from 'react-hot-toast'

interface Assignment {
  id: string
  status: string
  acceptedAt?: string
  trip: {
    id: string
    startTime: string
    endTime: string
    destination: {
      name: string
      address: string
    }
    city?: {
      name: string
    }
    area?: {
      name: string
    }
    bookings: Array<{
      id: string
      user: {
        name: string
        phone: string
      }
      rider?: {
        name: string
      }
      guestName?: string
      passengerCount: number
      pickupLocation?: {
        name: string
        address: string
      }
      pickupSavedAddress?: {
        name: string
        address: string
      }
    }>
  }
}

export default function DriverDashboard() {
  const { data: session, status } = useSession()
  const [isOnline, setIsOnline] = useState(false)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'DRIVER') {
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
      // Fetch driver status
      const statusRes = await fetch('/api/driver/status')
      if (statusRes.ok) {
        const statusData = await statusRes.json()
        setIsOnline(statusData.status.isOnline)
      }

      // Fetch trips (active and today's trips)
      const tripsRes = await fetch('/api/driver/trips?includeCompleted=false&limit=50')
      if (tripsRes.ok) {
        const tripsData = await tripsRes.json()
        setAssignments(tripsData.trips || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const toggleOnlineStatus = async () => {
    setUpdatingStatus(true)
    try {
      const res = await fetch('/api/driver/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: !isOnline })
      })

      if (res.ok) {
        const data = await res.json()
        setIsOnline(data.driver.isOnline)
        toast.success(data.message)
      } else {
        toast.error('Failed to update status')
      }
    } catch (error) {
      toast.error('Error updating status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleAccept = async (assignmentId: string) => {
    try {
      const res = await fetch(`/api/driver/trips/${assignmentId}/accept`, {
        method: 'POST'
      })

      if (res.ok) {
        toast.success('Trip accepted!')
        fetchData() // Refresh
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to accept trip')
      }
    } catch (error) {
      toast.error('Error accepting trip')
    }
  }

  const handleDecline = async (assignmentId: string) => {
    const reason = prompt('Why are you declining this trip?')
    if (!reason) return

    try {
      const res = await fetch(`/api/driver/trips/${assignmentId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })

      if (res.ok) {
        toast.success('Trip declined')
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to decline trip')
      }
    } catch (error) {
      toast.error('Error declining trip')
    }
  }

  const handleStart = async (assignmentId: string) => {
    try {
      const res = await fetch(`/api/driver/trips/${assignmentId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (res.ok) {
        toast.success('Trip started! Drive safely.')
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to start trip')
      }
    } catch (error) {
      toast.error('Error starting trip')
    }
  }

  const handleArrive = async (assignmentId: string) => {
    try {
      const res = await fetch(`/api/driver/trips/${assignmentId}/arrive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (res.ok) {
        toast.success('Marked as arrived')
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to mark arrival')
      }
    } catch (error) {
      toast.error('Error marking arrival')
    }
  }

  const handleComplete = async (assignmentId: string) => {
    if (!confirm('Mark this trip as completed?')) return

    try {
      const res = await fetch(`/api/driver/trips/${assignmentId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })

      if (res.ok) {
        toast.success('Trip completed! Great job.')
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to complete trip')
      }
    } catch (error) {
      toast.error('Error completing trip')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  // Separate assignments by status and date
  const pendingAssignments = assignments.filter(a => a.status === 'ASSIGNED')
  const activeAssignments = assignments.filter(a => ['ACCEPTED', 'IN_PROGRESS', 'ARRIVED'].includes(a.status))
  const todayTrips = assignments.filter(a => isToday(parseISO(a.trip.startTime)))

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ASSIGNED': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'ACCEPTED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'ARRIVED': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ASSIGNED': return 'New Assignment'
      case 'ACCEPTED': return 'Accepted'
      case 'IN_PROGRESS': return 'En Route'
      case 'ARRIVED': return 'Arrived'
      default: return status
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-indigo-900">
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
                  Driver Dashboard
                </h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/driver/earnings"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Earnings
              </Link>
              <Link
                href="/profile"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Profile
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Online Toggle */}
        <div className="mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Welcome back, {session.user.name}!
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {isOnline ? 'You are currently online and receiving trips' : 'You are offline'}
                </p>
              </div>
              <button
                onClick={toggleOnlineStatus}
                disabled={updatingStatus}
                className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors ${
                  isOnline
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500'
                } ${updatingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-10 w-10 transform rounded-full bg-white transition-transform ${
                    isOnline ? 'translate-x-12' : 'translate-x-1'
                  }`}
                />
                <span className={`absolute text-sm font-medium text-white ${isOnline ? 'left-2' : 'right-2'}`}>
                  {isOnline ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800">
            <div className="text-3xl mb-2">⏰</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{pendingAssignments.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Pending Assignments</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
            <div className="text-3xl mb-2">🚗</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{activeAssignments.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Active Trips</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
            <div className="text-3xl mb-2">📅</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{todayTrips.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Today's Trips</div>
          </div>
        </div>

        {/* Pending Assignments */}
        {pendingAssignments.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              🔔 New Assignments - Action Required
            </h3>
            <div className="space-y-4">
              {pendingAssignments.map((assignment) => (
                <TripCard
                  key={assignment.id}
                  assignment={assignment}
                  onAccept={() => handleAccept(assignment.id)}
                  onDecline={() => handleDecline(assignment.id)}
                  getStatusColor={getStatusColor}
                  getStatusLabel={getStatusLabel}
                />
              ))}
            </div>
          </div>
        )}

        {/* Active Trips */}
        {activeAssignments.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              🚗 Active Trips
            </h3>
            <div className="space-y-4">
              {activeAssignments.map((assignment) => (
                <TripCard
                  key={assignment.id}
                  assignment={assignment}
                  onStart={assignment.status === 'ACCEPTED' ? () => handleStart(assignment.id) : undefined}
                  onArrive={assignment.status === 'IN_PROGRESS' ? () => handleArrive(assignment.id) : undefined}
                  onComplete={['IN_PROGRESS', 'ARRIVED'].includes(assignment.status) ? () => handleComplete(assignment.id) : undefined}
                  getStatusColor={getStatusColor}
                  getStatusLabel={getStatusLabel}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {assignments.length === 0 && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-200/50 dark:border-gray-700/50 p-12 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No trips yet
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {isOnline ? 'You\'re online and ready to receive trips!' : 'Go online to start receiving trip assignments'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// Trip Card Component
function TripCard({
  assignment,
  onAccept,
  onDecline,
  onStart,
  onArrive,
  onComplete,
  getStatusColor,
  getStatusLabel
}: {
  assignment: Assignment
  onAccept?: () => void
  onDecline?: () => void
  onStart?: () => void
  onArrive?: () => void
  onComplete?: () => void
  getStatusColor: (status: string) => string
  getStatusLabel: (status: string) => string
}) {
  const tripDate = parseISO(assignment.trip.startTime)
  const dateLabel = isToday(tripDate) ? 'Today' : isTomorrow(tripDate) ? 'Tomorrow' : format(tripDate, 'MMM d')

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(assignment.status)}`}>
                {getStatusLabel(assignment.status)}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {dateLabel} at {format(tripDate, 'h:mm a')}
              </span>
            </div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white">
              {assignment.trip.destination.name}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {assignment.trip.destination.address}
            </p>
            {assignment.trip.city && (
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                {assignment.trip.city.name} {assignment.trip.area && `• ${assignment.trip.area.name}`}
              </p>
            )}
          </div>
        </div>

        {/* Passengers */}
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Passengers ({assignment.trip.bookings.length}):
          </p>
          <div className="space-y-2">
            {assignment.trip.bookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between text-sm bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {booking.rider?.name || booking.guestName || booking.user.name}
                    {booking.passengerCount > 1 && ` (+${booking.passengerCount - 1})`}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Pickup: {booking.pickupSavedAddress?.name || booking.pickupLocation?.name || 'TBD'}
                  </div>
                </div>
                <a
                  href={`tel:${booking.user.phone}`}
                  className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                >
                  📞 Call
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {onAccept && (
            <>
              <button
                onClick={onAccept}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold"
              >
                ✓ Accept
              </button>
              <button
                onClick={onDecline}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 font-semibold"
              >
                ✗ Decline
              </button>
            </>
          )}
          {onStart && (
            <button
              onClick={onStart}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-semibold"
            >
              🚗 Start Trip
            </button>
          )}
          {onArrive && (
            <button
              onClick={onArrive}
              className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 font-semibold"
            >
              📍 Mark Arrived
            </button>
          )}
          {onComplete && (
            <button
              onClick={onComplete}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-semibold"
            >
              ✓ Complete Trip
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
