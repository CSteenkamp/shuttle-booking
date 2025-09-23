'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { getUserDisplayName } from '@/lib/utils'
import WheelDatePicker from '@/components/ui/WheelDatePicker'
import SavedAddressesManager from '@/components/user/SavedAddressesManager'

interface Rider {
  id: string
  name: string
  phone: string | null
  relationship: string | null
  dateOfBirth: string | null
  medicalInfo: string | null
  emergencyContact: string | null
  notes: string | null
}

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const [riders, setRiders] = useState<Rider[]>([])
  const [showAddRider, setShowAddRider] = useState(false)
  const [editingRider, setEditingRider] = useState<Rider | null>(null)
  const [deletingRider, setDeletingRider] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      redirect('/auth/signin')
    }
  }, [session, status])

  useEffect(() => {
    fetchRiders()
  }, [])

  const fetchRiders = async () => {
    try {
      const response = await fetch('/api/user/riders')
      if (response.ok) {
        const data = await response.json()
        setRiders(data)
      }
    } catch (error) {
      console.error('Error fetching riders:', error)
    }
  }

  const handleDeleteRider = async (riderId: string) => {
    if (!confirm('Are you sure you want to delete this rider? This action cannot be undone.')) {
      return
    }

    setDeletingRider(riderId)
    try {
      const response = await fetch(`/api/user/riders/${riderId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchRiders()
      } else {
        const data = await response.json()
        alert(data.error || 'Failed to delete rider')
      }
    } catch {
      alert('An error occurred while deleting rider')
    } finally {
      setDeletingRider(null)
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
                  ShuttlePro
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
                href="/"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors duration-200 font-medium"
              >
                Home
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">Your Profile</h1>
            <p className="text-base text-gray-600 dark:text-gray-300">Manage your account and rider information</p>
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-200/50 dark:border-gray-700/50 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">👤</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Account Information</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-gray-900 dark:text-white">
                {session.user.name || 'Not provided'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-gray-900 dark:text-white">
                {session.user.email}
              </div>
            </div>
          </div>
        </div>

        {/* Saved Addresses Section */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-200/50 dark:border-gray-700/50 mb-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">📍</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Pickup Locations</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Manage your saved pickup addresses and default location</p>
            </div>
          </div>
          
          <SavedAddressesManager />
        </div>

        {/* Riders Section */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">👥</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Rider Management</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">Add and manage family members who use your account</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                {riders.length}/8 riders
              </span>
              {riders.length < 8 && (
                <button
                  onClick={() => setShowAddRider(true)}
                  className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg"
                >
                  + Add Rider
                </button>
              )}
            </div>
          </div>

          {/* Riders List */}
          {riders.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">👨‍👩‍👧‍👦</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No riders added yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Add family members to easily book rides for them
              </p>
              <button
                onClick={() => setShowAddRider(true)}
                className="bg-gradient-to-r from-purple-500 to-pink-600 text-white px-6 py-3 rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 font-medium shadow-md hover:shadow-lg"
              >
                Add Your First Rider
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {riders.map((rider) => (
                <div key={rider.id} className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-200 dark:border-purple-600 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-purple-900 dark:text-purple-200 text-lg">{rider.name}</h3>
                      <p className="text-sm text-purple-700 dark:text-purple-300">{rider.relationship}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setEditingRider(rider)}
                        className="text-purple-600 hover:text-purple-800 dark:text-purple-400 dark:hover:text-purple-200 transition-colors"
                        title="Edit rider"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDeleteRider(rider.id)}
                        disabled={deletingRider === rider.id}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 transition-colors disabled:opacity-50"
                        title="Delete rider"
                      >
                        {deletingRider === rider.id ? (
                          <div className="w-5 h-5 animate-spin rounded-full border-2 border-red-600 border-t-transparent"></div>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    {rider.phone && (
                      <div className="flex items-center space-x-2">
                        <span className="text-purple-600 dark:text-purple-400">📞</span>
                        <span className="text-purple-800 dark:text-purple-200">{rider.phone}</span>
                      </div>
                    )}
                    {rider.dateOfBirth && (
                      <div className="flex items-center space-x-2">
                        <span className="text-purple-600 dark:text-purple-400">🎂</span>
                        <span className="text-purple-800 dark:text-purple-200">
                          {new Date(rider.dateOfBirth).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    {rider.medicalInfo && (
                      <div className="flex items-start space-x-2">
                        <span className="text-red-600 dark:text-red-400 mt-0.5">🏥</span>
                        <span className="text-red-800 dark:text-red-200 text-xs">{rider.medicalInfo}</span>
                      </div>
                    )}
                    {rider.emergencyContact && (
                      <div className="flex items-start space-x-2">
                        <span className="text-orange-600 dark:text-orange-400 mt-0.5">🚨</span>
                        <span className="text-orange-800 dark:text-orange-200 text-xs">{rider.emergencyContact}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Rider Modal */}
      {(showAddRider || editingRider) && (
        <RiderModal
          rider={editingRider}
          onClose={() => {
            setShowAddRider(false)
            setEditingRider(null)
          }}
          onSave={() => {
            fetchRiders()
            setShowAddRider(false)
            setEditingRider(null)
          }}
        />
      )}
    </div>
  )
}

// Rider Modal Component
function RiderModal({ rider, onClose, onSave }: {
  rider: Rider | null
  onClose: () => void
  onSave: () => void
}) {
  const [formData, setFormData] = useState({
    name: rider?.name || '',
    phone: rider?.phone || '',
    relationship: rider?.relationship || 'Child',
    medicalInfo: rider?.medicalInfo || '',
    emergencyContact: rider?.emergencyContact || '',
    notes: rider?.notes || '',
  })
  
  const [dateOfBirth, setDateOfBirth] = useState<{ day: number; month: number; year: number } | null>(() => {
    if (rider?.dateOfBirth) {
      const date = new Date(rider.dateOfBirth)
      return {
        day: date.getDate(),
        month: date.getMonth() + 1,
        year: date.getFullYear()
      }
    }
    return null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      setError('Name is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const url = rider ? `/api/user/riders/${rider.id}` : '/api/user/riders'
      const method = rider ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth.year, dateOfBirth.month - 1, dateOfBirth.day).toISOString() : null,
        }),
      })

      if (response.ok) {
        onSave()
      } else {
        const data = await response.json()
        setError(data.details ? `${data.error}: ${data.details}` : data.error || 'An error occurred')
      }
    } catch {
      setError('An error occurred while saving')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              {rider ? 'Edit Rider' : 'Add New Rider'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Sarah Johnson"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Relationship
                </label>
                <select
                  value={formData.relationship}
                  onChange={(e) => setFormData({...formData, relationship: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="Child">Child</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Dependent">Dependent</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., 082 123 4567"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date of Birth
                </label>
                <WheelDatePicker
                  value={dateOfBirth}
                  onChange={setDateOfBirth}
                  minYear={1950}
                  maxYear={new Date().getFullYear()}
                />
              </div>
            </div>
          </div>

          {/* Medical Information */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Medical Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Medical Conditions, Allergies & Medications
                </label>
                <textarea
                  value={formData.medicalInfo}
                  onChange={(e) => setFormData({...formData, medicalInfo: e.target.value})}
                  rows={3}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Asthma (carries inhaler), allergic to peanuts, takes daily medication at 2pm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Emergency Contact
                </label>
                <input
                  type="text"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({...formData, emergencyContact: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Mom - Jane Smith: 082 987 6543"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Additional Notes for Drivers
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={2}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="e.g., Needs help with seatbelt, very shy with new people"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-lg transition-all duration-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
            >
              {loading ? 'Saving...' : (rider ? 'Update Rider' : 'Add Rider')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}