'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

interface Area {
  id: string
  name: string
  description: string | null
  status: string
  boundaries: any
  createdAt: string
  _count: {
    driverAreas: number
    locations: number
  }
}

interface City {
  id: string
  name: string
  timezone: string
  status: string
  operatingHours: any
  settings: any
  createdAt: string
  areas: Area[]
  _count: {
    areas: number
    drivers: number
    locations: number
    trips: number
  }
}

export default function CityManagement() {
  const { data: session, status } = useSession()
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [showCityModal, setShowCityModal] = useState(false)
  const [showAreaModal, setShowAreaModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [expandedCity, setExpandedCity] = useState<string | null>(null)

  const [cityFormData, setCityFormData] = useState({
    name: '',
    timezone: 'Africa/Johannesburg',
    status: 'ACTIVE'
  })

  const [areaFormData, setAreaFormData] = useState({
    name: '',
    description: '',
    status: 'ACTIVE',
    cityId: ''
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      redirect('/auth/signin')
    }
  }, [session, status])

  useEffect(() => {
    fetchCities()
  }, [])

  const fetchCities = async () => {
    try {
      const response = await fetch('/api/admin/cities')
      if (response.ok) {
        const data = await response.json()
        setCities(data.cities || [])
      }
    } catch (error) {
      console.error('Error fetching cities:', error)
    } finally {
      setLoading(false)
    }
  }

  const openCityModal = (city?: City) => {
    if (city) {
      setCityFormData({
        name: city.name,
        timezone: city.timezone,
        status: city.status
      })
      setSelectedCity(city)
    } else {
      setCityFormData({
        name: '',
        timezone: 'Africa/Johannesburg',
        status: 'ACTIVE'
      })
      setSelectedCity(null)
    }
    setShowCityModal(true)
  }

  const closeCityModal = () => {
    setShowCityModal(false)
    setSelectedCity(null)
    setCityFormData({
      name: '',
      timezone: 'Africa/Johannesburg',
      status: 'ACTIVE'
    })
  }

  const openAreaModal = (cityId: string) => {
    setAreaFormData({
      name: '',
      description: '',
      status: 'ACTIVE',
      cityId
    })
    setShowAreaModal(true)
  }

  const closeAreaModal = () => {
    setShowAreaModal(false)
    setAreaFormData({
      name: '',
      description: '',
      status: 'ACTIVE',
      cityId: ''
    })
  }

  const handleSaveCity = async () => {
    if (!cityFormData.name.trim()) {
      alert('Please enter a city name')
      return
    }

    setActionLoading(true)
    try {
      const url = selectedCity
        ? `/api/admin/cities/${selectedCity.id}`
        : '/api/admin/cities'

      const method = selectedCity ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cityFormData),
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message || `City ${selectedCity ? 'updated' : 'created'} successfully`)
        fetchCities()
        closeCityModal()
      } else {
        const error = await response.json()
        alert(error.error || `Failed to ${selectedCity ? 'update' : 'create'} city`)
      }
    } catch (error) {
      console.error('Error saving city:', error)
      alert('Error saving city')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSaveArea = async () => {
    if (!areaFormData.name.trim()) {
      alert('Please enter an area name')
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch('/api/admin/areas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(areaFormData),
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message || 'Area created successfully')
        fetchCities()
        closeAreaModal()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to create area')
      }
    } catch (error) {
      console.error('Error saving area:', error)
      alert('Error saving area')
    } finally {
      setActionLoading(false)
    }
  }

  const toggleCityExpansion = (cityId: string) => {
    setExpandedCity(expandedCity === cityId ? null : cityId)
  }

  const getStatusColor = (status: string) => {
    return status === 'ACTIVE'
      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
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

  const totalCities = cities.length
  const activeCities = cities.filter(c => c.status === 'ACTIVE').length
  const totalAreas = cities.reduce((sum, city) => sum + city._count.areas, 0)
  const totalDrivers = cities.reduce((sum, city) => sum + city._count.drivers, 0)

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              City & Area Management
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Manage operational cities and service areas
            </p>
          </div>
          <button
            onClick={() => openCityModal()}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Add City</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-700 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">Total Cities</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-200">{totalCities}</p>
              </div>
              <div className="w-12 h-12 bg-blue-200 dark:bg-blue-800 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🏙️</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-700 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-700 dark:text-green-300 mb-1">Active Cities</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-200">{activeCities}</p>
              </div>
              <div className="w-12 h-12 bg-green-200 dark:bg-green-800 rounded-xl flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-200 dark:border-purple-700 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-1">Total Areas</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-200">{totalAreas}</p>
              </div>
              <div className="w-12 h-12 bg-purple-200 dark:bg-purple-800 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📍</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 border border-amber-200 dark:border-amber-700 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-1">Total Drivers</p>
                <p className="text-3xl font-bold text-amber-900 dark:text-amber-200">{totalDrivers}</p>
              </div>
              <div className="w-12 h-12 bg-amber-200 dark:bg-amber-800 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🚗</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cities List */}
        <div className="space-y-4">
          {cities.map((city) => (
            <div
              key={city.id}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
            >
              {/* City Header */}
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <span className="text-white text-2xl">🏙️</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-1">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {city.name}
                        </h3>
                        <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(city.status)}`}>
                          {city.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {city.timezone} • {city._count.areas} areas • {city._count.drivers} drivers
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openAreaModal(city.id)}
                      className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 py-2 px-4 rounded-lg font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors flex items-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      <span>Add Area</span>
                    </button>
                    <button
                      onClick={() => openCityModal(city)}
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => toggleCityExpansion(city.id)}
                      className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg
                        className={`w-5 h-5 transform transition-transform ${expandedCity === city.id ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* City Stats */}
                <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{city._count.areas}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Areas</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{city._count.drivers}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Drivers</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{city._count.locations}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Locations</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{city._count.trips}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Trips</p>
                  </div>
                </div>
              </div>

              {/* Areas List (Expanded) */}
              {expandedCity === city.id && city.areas.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-700 p-6">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Areas in {city.name}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {city.areas.map((area) => (
                      <div
                        key={area.id}
                        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h5 className="font-semibold text-gray-900 dark:text-white mb-1">
                              {area.name}
                            </h5>
                            {area.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                {area.description}
                              </p>
                            )}
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(area.status)}`}>
                            {area.status}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                          <span>{area._count.driverAreas} drivers</span>
                          <span>{area._count.locations} locations</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {expandedCity === city.id && city.areas.length === 0 && (
                <div className="bg-gray-50 dark:bg-gray-900/30 border-t border-gray-200 dark:border-gray-700 p-6">
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">📍</span>
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">No areas yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">Add areas to define operational zones</p>
                    <button
                      onClick={() => openAreaModal(city.id)}
                      className="bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                    >
                      Add First Area
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {cities.length === 0 && (
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-12 text-center">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🏙️</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No cities yet</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Start by adding your first operational city
              </p>
              <button
                onClick={() => openCityModal()}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
              >
                Add Your First City
              </button>
            </div>
          )}
        </div>

        {/* City Modal */}
        {showCityModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedCity ? 'Edit City' : 'Add New City'}
                  </h3>
                  <button
                    onClick={closeCityModal}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      City Name *
                    </label>
                    <input
                      type="text"
                      value={cityFormData.name}
                      onChange={(e) => setCityFormData({...cityFormData, name: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Pretoria"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Timezone
                    </label>
                    <select
                      value={cityFormData.timezone}
                      onChange={(e) => setCityFormData({...cityFormData, timezone: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="Africa/Johannesburg">Africa/Johannesburg (SAST)</option>
                      <option value="Africa/Cape_Town">Africa/Cape_Town (SAST)</option>
                      <option value="UTC">UTC</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Status
                    </label>
                    <select
                      value={cityFormData.status}
                      onChange={(e) => setCityFormData({...cityFormData, status: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={closeCityModal}
                    disabled={actionLoading}
                    className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-3 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveCity}
                    disabled={actionLoading}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center"
                  >
                    {actionLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      selectedCity ? 'Update City' : 'Create City'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Area Modal */}
        {showAreaModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Add New Area
                  </h3>
                  <button
                    onClick={closeAreaModal}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Area Name *
                    </label>
                    <input
                      type="text"
                      value={areaFormData.name}
                      onChange={(e) => setAreaFormData({...areaFormData, name: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Hatfield, Brooklyn"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={areaFormData.description}
                      onChange={(e) => setAreaFormData({...areaFormData, description: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Brief description of the area..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Status
                    </label>
                    <select
                      value={areaFormData.status}
                      onChange={(e) => setAreaFormData({...areaFormData, status: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={closeAreaModal}
                    disabled={actionLoading}
                    className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-3 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveArea}
                    disabled={actionLoading}
                    className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center"
                  >
                    {actionLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      'Create Area'
                    )}
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
