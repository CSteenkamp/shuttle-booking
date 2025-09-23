'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

interface Location {
  id: string
  name: string
  address: string
  latitude: number | null
  longitude: number | null
  isFrequent: boolean
  category?: string
  status?: 'APPROVED' | 'PENDING' | 'REJECTED'
  createdAt: string
  _count: {
    trips: number
    pickupBookings: number
    dropoffBookings: number
  }
}

const locationCategories = [
  { id: 'school', name: 'Schools', icon: '🎓', color: 'blue' },
  { id: 'mall', name: 'Shopping Malls', icon: '🛍️', color: 'purple' },
  { id: 'office', name: 'Offices', icon: '🏢', color: 'gray' },
  { id: 'hospital', name: 'Medical Centers', icon: '🏥', color: 'red' },
  { id: 'restaurant', name: 'Restaurants', icon: '🍽️', color: 'orange' },
  { id: 'entertainment', name: 'Entertainment', icon: '🎪', color: 'pink' },
  { id: 'transport', name: 'Transport Hubs', icon: '🚌', color: 'green' },
  { id: 'other', name: 'Other', icon: '📍', color: 'indigo' }
]

export default function LocationManagement() {
  const { data: session, status } = useSession()
  const [locations, setLocations] = useState<Location[]>([])
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

  // New location form state
  const [newLocation, setNewLocation] = useState({
    name: '',
    address: '',
    category: 'other',
    isFrequent: true
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      redirect('/auth/signin')
    }
  }, [session, status])

  useEffect(() => {
    fetchLocations()
  }, [])

  useEffect(() => {
    filterLocations()
  }, [locations, searchTerm, selectedCategory, selectedStatus])

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/admin/locations')
      if (response.ok) {
        const data = await response.json()
        setLocations(data)
      }
    } catch (error) {
      console.error('Error fetching locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterLocations = () => {
    let filtered = locations

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(location => 
        location.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        location.address.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(location => location.category === selectedCategory)
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'frequent') {
        filtered = filtered.filter(location => location.isFrequent)
      } else if (selectedStatus === 'custom') {
        filtered = filtered.filter(location => !location.isFrequent)
      }
    }

    setFilteredLocations(filtered)
  }

  const addLocation = async () => {
    if (!newLocation.name.trim() || !newLocation.address.trim()) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/admin/locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newLocation),
      })

      if (response.ok) {
        alert('Location added successfully')
        fetchLocations()
        setShowAddModal(false)
        setNewLocation({
          name: '',
          address: '',
          category: 'other',
          isFrequent: true
        })
      } else {
        const errorData = await response.json()
        alert(`Failed to add location: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error adding location:', error)
      alert('Error adding location')
    }
  }

  const updateLocation = async (locationId: string, updates: Partial<Location>) => {
    try {
      const response = await fetch(`/api/admin/locations/${locationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        alert('Location updated successfully')
        fetchLocations()
        setShowEditModal(false)
        setSelectedLocation(null)
      } else {
        const errorData = await response.json()
        alert(`Failed to update location: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error updating location:', error)
      alert('Error updating location')
    }
  }

  const deleteLocation = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location? This action cannot be undone.')) return

    try {
      const response = await fetch(`/api/admin/locations/${locationId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Location deleted successfully')
        fetchLocations()
      } else {
        const errorData = await response.json()
        alert(`Failed to delete location: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error deleting location:', error)
      alert('Error deleting location')
    }
  }

  const openEditModal = (location: Location) => {
    setSelectedLocation(location)
    setShowEditModal(true)
  }

  const getCategoryInfo = (categoryId: string) => {
    return locationCategories.find(cat => cat.id === categoryId) || locationCategories.find(cat => cat.id === 'other')!
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
                Location Management
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                Manage frequent destinations, categories, and location approvals
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-3 rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
            >
              Add Location
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-2 border-blue-200 dark:border-blue-600 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600 dark:text-blue-300 mb-1">Total Locations</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{locations.length}</p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl">📍</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border-2 border-emerald-200 dark:border-emerald-600 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-300 mb-1">Frequent Locations</p>
                <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                  {locations.filter(l => l.isFrequent).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl">⭐</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-2 border-purple-200 dark:border-purple-600 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600 dark:text-purple-300 mb-1">Categories</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {new Set(locations.map(l => l.category).filter(Boolean)).size}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl">🏷️</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border-2 border-amber-200 dark:border-amber-600 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-600 dark:text-amber-300 mb-1">Active Usage</p>
                <p className="text-3xl font-bold text-amber-900 dark:text-amber-100">
                  {locations.reduce((sum, l) => sum + l._count.trips + l._count.pickupBookings + l._count.dropoffBookings, 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl">🚐</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Search Locations
              </label>
              <input
                type="text"
                placeholder="Search by name or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white"
              >
                <option value="all">All Categories</option>
                {locationCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Type
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="frequent">Frequent Locations</option>
                <option value="custom">Custom Addresses</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Showing {filteredLocations.length} of {locations.length} locations
            </p>
            <div className="flex space-x-2">
              {locationCategories.slice(0, 4).map((category) => (
                <span key={category.id} className={`px-3 py-1 bg-${category.color}-100 dark:bg-${category.color}-900/30 text-${category.color}-800 dark:text-${category.color}-300 text-sm rounded-full`}>
                  {category.icon} {locations.filter(l => l.category === category.id).length}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Locations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLocations.map((location) => {
            const categoryInfo = getCategoryInfo(location.category || 'other')
            const totalUsage = location._count.trips + location._count.pickupBookings + location._count.dropoffBookings

            return (
              <div key={location.id} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 hover:shadow-xl transition-all duration-200">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 bg-gradient-to-r from-${categoryInfo.color}-500 to-${categoryInfo.color}-600 rounded-xl flex items-center justify-center`}>
                      <span className="text-white text-lg">{categoryInfo.icon}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">{location.name}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{categoryInfo.name}</p>
                    </div>
                  </div>
                  {location.isFrequent && (
                    <span className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 px-2 py-1 rounded-full text-xs font-medium">
                      ⭐ Frequent
                    </span>
                  )}
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{location.address}</p>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <span>🚐 {location._count.trips} trips</span>
                    <span>📍 {location._count.pickupBookings + location._count.dropoffBookings} bookings</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => openEditModal(location)}
                    className="flex-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 py-2 px-3 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
                  >
                    Edit
                  </button>
                  {totalUsage === 0 && (
                    <button
                      onClick={() => deleteLocation(location.id)}
                      className="flex-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 py-2 px-3 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors text-sm font-medium"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {filteredLocations.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📍</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">No locations found</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">Try adjusting your search criteria</p>
          </div>
        )}

        {/* Add Location Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add New Location</h3>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Location Name *
                    </label>
                    <input
                      type="text"
                      value={newLocation.name}
                      onChange={(e) => setNewLocation({...newLocation, name: e.target.value})}
                      placeholder="e.g., Stellenbosch Primary School"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Address *
                    </label>
                    <input
                      type="text"
                      value={newLocation.address}
                      onChange={(e) => setNewLocation({...newLocation, address: e.target.value})}
                      placeholder="e.g., 123 School Street, Stellenbosch"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Category
                    </label>
                    <select
                      value={newLocation.category}
                      onChange={(e) => setNewLocation({...newLocation, category: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {locationCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isFrequent"
                      checked={newLocation.isFrequent}
                      onChange={(e) => setNewLocation({...newLocation, isFrequent: e.target.checked})}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isFrequent" className="ml-2 text-sm text-gray-700 dark:text-gray-200">
                      Mark as frequent destination
                    </label>
                  </div>
                </div>
                
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addLocation}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Location
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Location Modal */}
        {showEditModal && selectedLocation && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Location</h3>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Location Name
                    </label>
                    <input
                      type="text"
                      value={selectedLocation.name}
                      onChange={(e) => setSelectedLocation({...selectedLocation, name: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Address
                    </label>
                    <input
                      type="text"
                      value={selectedLocation.address}
                      onChange={(e) => setSelectedLocation({...selectedLocation, address: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Category
                    </label>
                    <select
                      value={selectedLocation.category || 'other'}
                      onChange={(e) => setSelectedLocation({...selectedLocation, category: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      {locationCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.icon} {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="editIsFrequent"
                      checked={selectedLocation.isFrequent}
                      onChange={(e) => setSelectedLocation({...selectedLocation, isFrequent: e.target.checked})}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="editIsFrequent" className="ml-2 text-sm text-gray-700 dark:text-gray-200">
                      Mark as frequent destination
                    </label>
                  </div>
                </div>
                
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateLocation(selectedLocation.id, {
                      name: selectedLocation.name,
                      address: selectedLocation.address,
                      category: selectedLocation.category,
                      isFrequent: selectedLocation.isFrequent
                    })}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}