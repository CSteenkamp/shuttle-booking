/**
 * Admin Analytics Dashboard
 * Comprehensive platform metrics and insights
 */

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import toast from 'react-hot-toast'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'

interface PlatformMetrics {
  revenue: {
    today: number
    week: number
    month: number
    allTime: number
    platformFees: {
      today: number
      week: number
      month: number
      allTime: number
    }
  }
  users: {
    total: number
    active: number
    new: { today: number; week: number; month: number }
    byRole: { customers: number; drivers: number; admins: number }
  }
  drivers: {
    total: number
    approved: number
    pending: number
    rejected: number
    online: number
    activeToday: number
  }
  bookings: {
    total: number
    today: number
    week: number
    month: number
    byStatus: {
      confirmed: number
      cancelled: number
      completed: number
      pending: number
    }
  }
  trips: {
    total: number
    today: number
    week: number
    month: number
    completed: number
    inProgress: number
    cancelled: number
    averageRating: number
  }
}

export default function AdminAnalytics() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [bookingData, setBookingData] = useState<any[]>([])
  const [cityPerformance, setCityPerformance] = useState<any[]>([])
  const [topDrivers, setTopDrivers] = useState<any[]>([])
  const [dateRange, setDateRange] = useState(30)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }

    if (status === 'authenticated') {
      fetchAllData()
    }
  }, [status, dateRange])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [metricsRes, revenueRes, bookingsRes, citiesRes, driversRes] = await Promise.all([
        fetch('/api/admin/analytics/metrics'),
        fetch(`/api/admin/analytics/revenue?days=${dateRange}`),
        fetch(`/api/admin/analytics/bookings?days=${dateRange}`),
        fetch('/api/admin/analytics/cities?limit=10'),
        fetch('/api/admin/analytics/drivers?limit=20')
      ])

      if (metricsRes.status === 403) {
        toast.error('Admin access required')
        redirect('/')
        return
      }

      const [metricsData, revenueData, bookingsData, citiesData, driversData] = await Promise.all([
        metricsRes.json(),
        revenueRes.json(),
        bookingsRes.json(),
        citiesRes.json(),
        driversRes.json()
      ])

      if (metricsData.success) setMetrics(metricsData.metrics)
      if (revenueData.success) setRevenueData(revenueData.data)
      if (bookingsData.success) setBookingData(bookingsData.data)
      if (citiesData.success) setCityPerformance(citiesData.cities)
      if (driversData.success) setTopDrivers(driversData.drivers)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <p className="text-red-800 dark:text-red-300">
              Failed to load analytics data. Please try again later.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  // Prepare pie chart data
  const userRoleData = [
    { name: 'Customers', value: metrics.users.byRole.customers },
    { name: 'Drivers', value: metrics.users.byRole.drivers },
    { name: 'Admins', value: metrics.users.byRole.admins }
  ]

  const bookingStatusData = [
    { name: 'Confirmed', value: metrics.bookings.byStatus.confirmed },
    { name: 'Completed', value: metrics.bookings.byStatus.completed },
    { name: 'Cancelled', value: metrics.bookings.byStatus.cancelled },
    { name: 'Pending', value: metrics.bookings.byStatus.pending }
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Platform Analytics
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Real-time insights and performance metrics
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <button
              onClick={fetchAllData}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg shadow-md p-6 text-white">
            <p className="text-sm opacity-90 mb-1">Today's Revenue</p>
            <p className="text-3xl font-bold">R{metrics.revenue.today.toLocaleString()}</p>
            <p className="text-xs opacity-75 mt-2">
              Platform Fee: R{metrics.revenue.platformFees.today.toLocaleString()}
            </p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg shadow-md p-6 text-white">
            <p className="text-sm opacity-90 mb-1">This Week</p>
            <p className="text-3xl font-bold">R{metrics.revenue.week.toLocaleString()}</p>
            <p className="text-xs opacity-75 mt-2">
              Platform Fee: R{metrics.revenue.platformFees.week.toLocaleString()}
            </p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-md p-6 text-white">
            <p className="text-sm opacity-90 mb-1">This Month</p>
            <p className="text-3xl font-bold">R{metrics.revenue.month.toLocaleString()}</p>
            <p className="text-xs opacity-75 mt-2">
              Platform Fee: R{metrics.revenue.platformFees.month.toLocaleString()}
            </p>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg shadow-md p-6 text-white">
            <p className="text-sm opacity-90 mb-1">All Time</p>
            <p className="text-3xl font-bold">R{metrics.revenue.allTime.toLocaleString()}</p>
            <p className="text-xs opacity-75 mt-2">
              Platform Fee: R{metrics.revenue.platformFees.allTime.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Users</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {metrics.users.total.toLocaleString()}
            </p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              +{metrics.users.new.today} today
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Drivers</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {metrics.drivers.online}/{metrics.drivers.approved}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {metrics.drivers.activeToday} active today
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Today's Bookings</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {metrics.bookings.today}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {metrics.bookings.week} this week
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Average Rating</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {metrics.trips.averageRating.toFixed(1)}⭐
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {metrics.trips.completed} trips
            </p>
          </div>
        </div>

        {/* Revenue & Bookings Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Revenue Trend
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="Revenue (R)"
                />
                <Line
                  type="monotone"
                  dataKey="platformFee"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Platform Fee (R)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Bookings Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Booking Trends
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bookingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="date"
                  stroke="#9CA3AF"
                  tick={{ fontSize: 12 }}
                />
                <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Legend />
                <Bar dataKey="bookings" fill="#8B5CF6" name="Total" />
                <Bar dataKey="completed" fill="#10B981" name="Completed" />
                <Bar dataKey="cancelled" fill="#EF4444" name="Cancelled" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pie Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* User Roles */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Users by Role
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={userRoleData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userRoleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Booking Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Bookings by Status
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={bookingStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {bookingStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* City Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Top Performing Cities
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    City
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Revenue
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Bookings
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Active Drivers
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Avg Rating
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Growth
                  </th>
                </tr>
              </thead>
              <tbody>
                {cityPerformance.map((city, index) => (
                  <tr
                    key={city.cityId}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500 dark:text-gray-500">#{index + 1}</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {city.cityName}
                        </span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">
                      R{city.revenue.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 text-gray-700 dark:text-gray-300">
                      {city.bookings}
                    </td>
                    <td className="text-right py-3 px-4 text-gray-700 dark:text-gray-300">
                      {city.activeDrivers}
                    </td>
                    <td className="text-right py-3 px-4 text-gray-700 dark:text-gray-300">
                      {city.averageRating.toFixed(1)}⭐
                    </td>
                    <td className={`text-right py-3 px-4 font-medium ${
                      city.growth > 0 ? 'text-green-600' : city.growth < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {city.growth > 0 ? '+' : ''}{city.growth}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Drivers */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Top Performing Drivers
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Driver
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    City
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Trips
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Earnings
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Rating
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Acceptance
                  </th>
                </tr>
              </thead>
              <tbody>
                {topDrivers.map((driver, index) => (
                  <tr
                    key={driver.driverId}
                    className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500 dark:text-gray-500">#{index + 1}</span>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {driver.driverName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            {driver.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300">
                      {driver.city}
                    </td>
                    <td className="text-right py-3 px-4 text-gray-700 dark:text-gray-300">
                      {driver.completedTrips}
                    </td>
                    <td className="text-right py-3 px-4 font-medium text-gray-900 dark:text-white">
                      R{driver.totalEarnings.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-4 text-gray-700 dark:text-gray-300">
                      {driver.averageRating.toFixed(1)}⭐
                    </td>
                    <td className="text-right py-3 px-4 text-gray-700 dark:text-gray-300">
                      {driver.acceptanceRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
