'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

interface DriverArea {
  id: string
  isPrimary: boolean
  area: {
    id: string
    name: string
    city: {
      id: string
      name: string
    }
  }
}

interface Driver {
  id: string
  userId: string
  status: string
  licenseNumber: string
  licenseType: string
  yearsExperience: number
  vehicleMake: string
  vehicleModel: string
  vehicleYear: number | null
  vehiclePlate: string
  vehicleColor: string
  vehicleSeats: number
  bankDetails: any
  baseRate: number | null
  perMinuteRate: number | null
  perKmRate: number | null
  totalTrips: number
  completedTrips: number
  averageRating: number | null
  createdAt: string
  approvedAt: string | null
  user: {
    id: string
    name: string
    email: string
    phone: string | null
  }
  driverAreas: DriverArea[]
  _count: {
    tripAssignments: number
  }
}

interface ApprovalData {
  notes?: string
  baseRate?: number
  perMinuteRate?: number
  perKmRate?: number
}

export default function DriverManagement() {
  const { data: session, status } = useSession()
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [filteredDrivers, setFilteredDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [approvalData, setApprovalData] = useState<ApprovalData>({})
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'TOWN_ADMIN')) {
      redirect('/auth/signin')
    }
  }, [session, status])

  useEffect(() => {
    fetchDrivers()
  }, [])

  useEffect(() => {
    filterDrivers()
  }, [drivers, searchTerm, statusFilter])

  const fetchDrivers = async () => {
    try {
      const response = await fetch('/api/admin/drivers')
      if (response.ok) {
        const data = await response.json()
        setDrivers(data.drivers || [])
      }
    } catch (error) {
      console.error('Error fetching drivers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterDrivers = () => {
    let filtered = drivers

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(driver =>
        driver.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
        driver.licenseNumber.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(driver => driver.status === statusFilter)
    }

    setFilteredDrivers(filtered)
  }

  const openDetailsModal = (driver: Driver) => {
    setSelectedDriver(driver)
    setShowDetailsModal(true)
  }

  const closeDetailsModal = () => {
    setSelectedDriver(null)
    setShowDetailsModal(false)
  }

  const openApprovalModal = (driver: Driver) => {
    setSelectedDriver(driver)
    setApprovalData({
      notes: '',
      baseRate: driver.baseRate || undefined,
      perMinuteRate: driver.perMinuteRate || undefined,
      perKmRate: driver.perKmRate || undefined
    })
    setShowApprovalModal(true)
    setShowDetailsModal(false)
  }

  const closeApprovalModal = () => {
    setSelectedDriver(null)
    setShowApprovalModal(false)
    setApprovalData({})
  }

  const approveDriver = async () => {
    if (!selectedDriver) return

    setActionLoading(true)
    try {
      const response = await fetch(`/api/admin/drivers/${selectedDriver.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(approvalData),
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message || 'Driver approved successfully')
        fetchDrivers()
        closeApprovalModal()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to approve driver')
      }
    } catch (error) {
      console.error('Error approving driver:', error)
      alert('Error approving driver')
    } finally {
      setActionLoading(false)
    }
  }

  const rejectDriver = async (reason: string) => {
    if (!selectedDriver) return
    if (!reason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    setActionLoading(true)
    try {
      const response = await fetch(`/api/admin/drivers/${selectedDriver.id}/approve?reason=${encodeURIComponent(reason)}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message || 'Driver application rejected')
        fetchDrivers()
        closeDetailsModal()
      } else {
        const error = await response.json()
        alert(error.error || 'Failed to reject driver')
      }
    } catch (error) {
      console.error('Error rejecting driver:', error)
      alert('Error rejecting driver')
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
      case 'ACTIVE':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'SUSPENDED':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
      case 'REJECTED':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
      default:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
    }
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

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'TOWN_ADMIN')) {
    return null
  }

  const pendingCount = drivers.filter(d => d.status === 'PENDING').length
  const activeCount = drivers.filter(d => d.status === 'ACTIVE').length
  const rejectedCount = drivers.filter(d => d.status === 'REJECTED').length

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Driver Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Review and approve driver applications
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30 border border-yellow-200 dark:border-yellow-700 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-300 mb-1">Pending</p>
                <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-200">{pendingCount}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-200 dark:bg-yellow-800 rounded-xl flex items-center justify-center">
                <span className="text-2xl">⏳</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-200 dark:border-green-700 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-green-700 dark:text-green-300 mb-1">Active</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-200">{activeCount}</p>
              </div>
              <div className="w-12 h-12 bg-green-200 dark:bg-green-800 rounded-xl flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 border border-gray-200 dark:border-gray-600 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Rejected</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-gray-200">{rejectedCount}</p>
              </div>
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                <span className="text-2xl">❌</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border border-blue-200 dark:border-blue-700 rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">Total</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-200">{drivers.length}</p>
              </div>
              <div className="w-12 h-12 bg-blue-200 dark:bg-blue-800 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🚗</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Search Drivers
              </label>
              <input
                type="text"
                placeholder="Search by name, email, plate, license..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Filter by Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Showing {filteredDrivers.length} of {drivers.length} drivers
            </p>
          </div>
        </div>

        {/* Drivers Table */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Driver
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Vehicle
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    License
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Areas
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Stats
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
                {filteredDrivers.map((driver) => (
                  <tr key={driver.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                          <span className="text-white font-bold text-sm">
                            {driver.user.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {driver.user.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {driver.user.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white font-medium">
                        {driver.vehicleMake} {driver.vehicleModel}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {driver.vehiclePlate} • {driver.vehicleColor}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {driver.licenseNumber}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {driver.yearsExperience} years exp
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      {driver.driverAreas.length > 0 ? (
                        <div>
                          <div className="text-sm text-gray-900 dark:text-white font-medium">
                            {driver.driverAreas[0].area.city.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {driver.driverAreas.map(da => da.area.name).join(', ')}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No areas</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {driver.completedTrips} / {driver.totalTrips} trips
                      </div>
                      {driver.averageRating && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ⭐ {driver.averageRating.toFixed(1)}
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(driver.status)}`}>
                        {driver.status}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <button
                        onClick={() => openDetailsModal(driver)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredDrivers.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🚗</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No drivers found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Try adjusting your search criteria</p>
            </div>
          )}
        </div>

        {/* Driver Details Modal */}
        {showDetailsModal && selectedDriver && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full my-8">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Driver Application Details</h3>
                  <button
                    onClick={closeDetailsModal}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Personal Info */}
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-6">
                    <h4 className="font-bold text-blue-900 dark:text-blue-200 mb-4 flex items-center">
                      <span className="text-xl mr-2">👤</span>
                      Personal Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Name</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{selectedDriver.user.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{selectedDriver.user.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Phone</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{selectedDriver.user.phone || 'Not provided'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Applied</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {new Date(selectedDriver.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* License Info */}
                  <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-6">
                    <h4 className="font-bold text-amber-900 dark:text-amber-200 mb-4 flex items-center">
                      <span className="text-xl mr-2">📋</span>
                      License Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">License Number</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{selectedDriver.licenseNumber}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">License Type</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{selectedDriver.licenseType}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Years of Experience</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{selectedDriver.yearsExperience} years</p>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Info */}
                  <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-xl p-6">
                    <h4 className="font-bold text-purple-900 dark:text-purple-200 mb-4 flex items-center">
                      <span className="text-xl mr-2">🚗</span>
                      Vehicle Information
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Make & Model</p>
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {selectedDriver.vehicleMake} {selectedDriver.vehicleModel}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">License Plate</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{selectedDriver.vehiclePlate}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Color</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{selectedDriver.vehicleColor}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Seats</p>
                        <p className="font-semibold text-gray-900 dark:text-white">{selectedDriver.vehicleSeats} seats</p>
                      </div>
                      {selectedDriver.vehicleYear && (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Year</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{selectedDriver.vehicleYear}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operational Areas */}
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-xl p-6">
                    <h4 className="font-bold text-indigo-900 dark:text-indigo-200 mb-4 flex items-center">
                      <span className="text-xl mr-2">📍</span>
                      Operational Areas
                    </h4>
                    {selectedDriver.driverAreas.length > 0 ? (
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          City: <span className="font-semibold text-gray-900 dark:text-white">{selectedDriver.driverAreas[0].area.city.name}</span>
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedDriver.driverAreas.map((da, idx) => (
                            <span
                              key={da.id}
                              className={`px-3 py-1 text-sm rounded-full ${
                                da.isPrimary
                                  ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-900 dark:text-indigo-200 font-semibold'
                                  : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-300'
                              }`}
                            >
                              {da.area.name} {da.isPrimary && '(Primary)'}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">No areas assigned</p>
                    )}
                  </div>

                  {/* Banking Info */}
                  {selectedDriver.bankDetails && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 rounded-xl p-6">
                      <h4 className="font-bold text-emerald-900 dark:text-emerald-200 mb-4 flex items-center">
                        <span className="text-xl mr-2">💳</span>
                        Banking Information
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Bank Name</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{selectedDriver.bankDetails.bankName}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Account Holder</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{selectedDriver.bankDetails.accountHolder}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Account Number</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{selectedDriver.bankDetails.accountNumber}</p>
                        </div>
                        {selectedDriver.bankDetails.branchCode && (
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Branch Code</p>
                            <p className="font-semibold text-gray-900 dark:text-white">{selectedDriver.bankDetails.branchCode}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Custom Rates */}
                  {(selectedDriver.baseRate || selectedDriver.perMinuteRate || selectedDriver.perKmRate) && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl p-6">
                      <h4 className="font-bold text-yellow-900 dark:text-yellow-200 mb-4 flex items-center">
                        <span className="text-xl mr-2">💰</span>
                        Requested Custom Rates
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {selectedDriver.baseRate && (
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Base Rate</p>
                            <p className="font-semibold text-gray-900 dark:text-white">R{selectedDriver.baseRate}</p>
                          </div>
                        )}
                        {selectedDriver.perMinuteRate && (
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Per Minute</p>
                            <p className="font-semibold text-gray-900 dark:text-white">R{selectedDriver.perMinuteRate}</p>
                          </div>
                        )}
                        {selectedDriver.perKmRate && (
                          <div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Per Km</p>
                            <p className="font-semibold text-gray-900 dark:text-white">R{selectedDriver.perKmRate}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {selectedDriver.status === 'PENDING' && (
                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={() => {
                        const reason = prompt('Please provide a reason for rejection:')
                        if (reason) rejectDriver(reason)
                      }}
                      disabled={actionLoading}
                      className="flex-1 bg-red-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      Reject Application
                    </button>
                    <button
                      onClick={() => openApprovalModal(selectedDriver)}
                      disabled={actionLoading}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50"
                    >
                      Approve Driver
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Approval Modal */}
        {showApprovalModal && selectedDriver && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Approve Driver Application</h3>
                  <button
                    onClick={closeApprovalModal}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-xl p-4">
                    <p className="text-green-800 dark:text-green-200 text-sm">
                      <strong>Approving:</strong> {selectedDriver.user.name} ({selectedDriver.user.email})
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Custom Rates (Optional - Subject to approval)
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Base Rate (R)</label>
                        <input
                          type="number"
                          min="0"
                          value={approvalData.baseRate || ''}
                          onChange={(e) => setApprovalData({...approvalData, baseRate: parseInt(e.target.value) || undefined})}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Per Minute (R)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={approvalData.perMinuteRate || ''}
                          onChange={(e) => setApprovalData({...approvalData, perMinuteRate: parseFloat(e.target.value) || undefined})}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="2.5"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Per Km (R)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={approvalData.perKmRate || ''}
                          onChange={(e) => setApprovalData({...approvalData, perKmRate: parseFloat(e.target.value) || undefined})}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="15"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                      Admin Notes (Optional)
                    </label>
                    <textarea
                      rows={3}
                      value={approvalData.notes || ''}
                      onChange={(e) => setApprovalData({...approvalData, notes: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Any notes about the approval..."
                    />
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={closeApprovalModal}
                    disabled={actionLoading}
                    className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-3 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={approveDriver}
                    disabled={actionLoading}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 px-4 rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 flex items-center justify-center"
                  >
                    {actionLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Approving...
                      </>
                    ) : (
                      'Confirm Approval'
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
