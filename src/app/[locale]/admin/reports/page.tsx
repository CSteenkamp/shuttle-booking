'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import RevenueChart from '@/components/admin/reports/RevenueChart'
import BookingsTrendChart from '@/components/admin/reports/BookingsTrendChart'
import UserGrowthChart from '@/components/admin/reports/UserGrowthChart'
import TripUtilizationChart from '@/components/admin/reports/TripUtilizationChart'
import LocationAnalyticsChart from '@/components/admin/reports/LocationAnalyticsChart'
import FinancialSummary from '@/components/admin/reports/FinancialSummary'
import OperationalMetrics from '@/components/admin/reports/OperationalMetrics'
import ExportOptions from '@/components/admin/reports/ExportOptions'
import DateRangeFilter from '@/components/admin/reports/DateRangeFilter'
import { startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns'

interface DateRange {
  start: Date
  end: Date
  label: string
}

interface ReportData {
  dateRange: {
    start: Date
    end: Date
    days: number
  }
  revenueTrend: Array<{
    date: string
    revenue: number
    transactions: number
    credits: number
  }>
  bookingsTrend: Array<{
    date: string
    bookings: number
    confirmed: number
    cancelled: number
  }>
  userGrowth: Array<{
    date: string
    newUsers: number
    totalUsers: number
    activeUsers: number
  }>
  tripUtilization: Array<{
    destination: string
    maxPassengers: number
    bookings: number
    utilization: number
    revenue: number
    date: string
  }>
  locationAnalytics: Array<{
    name: string
    category: string
    totalTrips: number
    totalBookings: number
    popularity: number
  }>
  financial: {
    totalRevenue: number
    totalCreditsIssued: number
    totalCreditsUsed: number
    creditValue: number
    averageRevenuePerDay: number
    creditFlow: {
      purchased: number
      used: number
      balance: number
    }
  }
  operational: {
    totalTrips: number
    completedTrips: number
    cancelledTrips: number
    totalBookings: number
    confirmedBookings: number
    averageUtilization: number
    peakDestinations: Array<{
      name: string
      category: string
      totalTrips: number
      totalBookings: number
      popularity: number
    }>
    newUsers: number
  }
  analytics: {
    keyInsights: Array<{
      title: string
      description: string
    }>
    kpis: Record<string, number | string>
  }
}

const presetRanges: DateRange[] = [
  {
    start: startOfMonth(new Date()),
    end: endOfMonth(new Date()),
    label: 'This Month'
  },
  {
    start: startOfYear(new Date()),
    end: endOfYear(new Date()),
    label: 'This Year'
  },
  {
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date(),
    label: 'Last 30 Days'
  },
  {
    start: new Date(new Date().setDate(new Date().getDate() - 90)),
    end: new Date(),
    label: 'Last 90 Days'
  }
]

export default function ReportsPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState<DateRange>(presetRanges[0])
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'financial' | 'operational' | 'analytics'>('overview')

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      redirect('/admin')
    }
  }, [session, status])

  useEffect(() => {
    if (session) {
      fetchReportData()
    }
  }, [session, dateRange]) // fetchReportData is defined inline and uses dateRange

  const fetchReportData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        startDate: dateRange.start.toISOString(),
        endDate: dateRange.end.toISOString()
      })

      const response = await fetch(`/api/admin/reports?${params}`)
      if (response.ok) {
        const data = await response.json()
        setReportData(data)
      }
    } catch (error) {
      console.error('Error fetching report data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDateRangeChange = (newRange: DateRange) => {
    setDateRange(newRange)
  }

  const handleCustomDateRange = (start: Date, end: Date) => {
    setDateRange({
      start,
      end,
      label: `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
    })
  }

  if (status === 'loading' || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-center">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto"></div>
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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              📈 Analytics & Reports
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Comprehensive insights and business intelligence for {dateRange.label.toLowerCase()}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
            <DateRangeFilter
              selectedRange={dateRange}
              presetRanges={presetRanges}
              onRangeChange={handleDateRangeChange}
              onCustomRange={handleCustomDateRange}
            />
            <ExportOptions reportData={reportData} dateRange={dateRange} />
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: '📊' },
              { id: 'financial', name: 'Financial', icon: '💰' },
              { id: 'operational', name: 'Operational', icon: '🚐' },
              { id: 'analytics', name: 'Analytics', icon: '📈' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'overview' | 'financial' | 'operational' | 'analytics')}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        {!reportData ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Chart */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Revenue Trend
                  </h3>
                  <RevenueChart data={reportData.revenueTrend} />
                </div>

                {/* Bookings Trend */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Booking Trends
                  </h3>
                  <BookingsTrendChart data={reportData.bookingsTrend} />
                </div>

                {/* User Growth */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    User Growth
                  </h3>
                  <UserGrowthChart data={reportData.userGrowth} />
                </div>

                {/* Trip Utilization */}
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Trip Utilization
                  </h3>
                  <TripUtilizationChart data={reportData.tripUtilization} />
                </div>
              </div>
            )}

            {activeTab === 'financial' && (
              <div className="space-y-6">
                <FinancialSummary data={reportData.financial} />
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Revenue Analysis
                    </h3>
                    <RevenueChart data={reportData.revenueTrend} showDetailedView />
                  </div>
                  
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Credit Flow Analysis
                    </h3>
                    <div className="space-y-4">
                      {reportData.financial.creditFlow && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center p-4 bg-green-50 dark:bg-green-900/30 rounded-lg">
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                              R{reportData.financial.creditFlow.purchased.toLocaleString()}
                            </div>
                            <div className="text-sm text-green-700 dark:text-green-300">Credits Purchased</div>
                          </div>
                          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {reportData.financial.creditFlow.used.toLocaleString()}
                            </div>
                            <div className="text-sm text-blue-700 dark:text-blue-300">Credits Used</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'operational' && (
              <div className="space-y-6">
                <OperationalMetrics data={reportData.operational} />
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Location Performance
                    </h3>
                    <LocationAnalyticsChart data={reportData.locationAnalytics} />
                  </div>
                  
                  <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Trip Performance Metrics
                    </h3>
                    <TripUtilizationChart data={reportData.tripUtilization} showDetailedView />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Advanced Analytics
                  </h3>
                  <div className="space-y-4">
                    {reportData.analytics.keyInsights?.map((insight, index: number) => (
                      <div key={index} className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <span className="text-blue-500 text-lg">💡</span>
                          <div>
                            <h4 className="font-medium text-blue-900 dark:text-blue-200">
                              {insight.title}
                            </h4>
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                              {insight.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Performance Indicators
                  </h3>
                  <div className="space-y-4">
                    {reportData.analytics.kpis && Object.entries(reportData.analytics.kpis).map(([key, value]) => (
                      <div key={key} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <span className="font-medium text-gray-700 dark:text-gray-300 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                        </span>
                        <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                          {typeof value === 'number' ? value.toLocaleString() : value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  )
}