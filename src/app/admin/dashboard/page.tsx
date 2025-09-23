'use client'

import { useSession } from 'next-auth/react'
import { redirect, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

interface DashboardStats {
  // Core metrics
  totalUsers: number
  totalTrips: number
  totalBookings: number
  totalRevenue: number
  
  // Today's activity
  todayBookings: number
  newUsersToday: number
  todayRevenue: number
  todayCreditActivity: {
    added: number
    used: number
    refunded: number
  }
  
  // Weekly/Monthly trends
  newUsersThisWeek: number
  weeklyBookings: number
  monthlyBookings: number
  
  // Trip status breakdown
  activeTrips: number
  completedTrips: number
  cancelledTrips: number
  tripsToday: number
  
  // Booking status breakdown
  confirmedBookings: number
  cancelledBookings: number
  pendingBookings: number
  
  // Credit metrics
  totalCreditsIssued: number
  totalCreditsUsed: number
  totalCreditsRefunded: number
  totalCurrentCredits: number
  creditValue: number
  
  // Performance metrics
  avgBookingsPerUser: number
  utilizationRate: number
  
  // Quick insights
  upcomingTrips: Array<{
    id: string
    destination: string
    startTime: string
    bookings: number
    maxPassengers: number
  }>
  
  // System health
  activeUsersWithCredits: number
  usersWithBookings: number
}

interface RecentActivity {
  id: string
  type: 'booking' | 'trip' | 'user' | 'credit'
  description: string
  timestamp: string
  user?: string
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    // Core metrics
    totalUsers: 0,
    totalTrips: 0,
    totalBookings: 0,
    totalRevenue: 0,
    
    // Today's activity
    todayBookings: 0,
    newUsersToday: 0,
    todayRevenue: 0,
    todayCreditActivity: { added: 0, used: 0, refunded: 0 },
    
    // Weekly/Monthly trends
    newUsersThisWeek: 0,
    weeklyBookings: 0,
    monthlyBookings: 0,
    
    // Trip status breakdown
    activeTrips: 0,
    completedTrips: 0,
    cancelledTrips: 0,
    tripsToday: 0,
    
    // Booking status breakdown
    confirmedBookings: 0,
    cancelledBookings: 0,
    pendingBookings: 0,
    
    // Credit metrics
    totalCreditsIssued: 0,
    totalCreditsUsed: 0,
    totalCreditsRefunded: 0,
    totalCurrentCredits: 0,
    creditValue: 25,
    
    // Performance metrics
    avgBookingsPerUser: 0,
    utilizationRate: 0,
    
    // Quick insights
    upcomingTrips: [],
    
    // System health
    activeUsersWithCredits: 0,
    usersWithBookings: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      redirect('/auth/signin')
    }
  }, [session, status])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, activityResponse] = await Promise.all([
        fetch('/api/admin/dashboard/stats'),
        fetch('/api/admin/dashboard/activity')
      ])

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      }

      if (activityResponse.ok) {
        const activityData = await activityResponse.json()
        setRecentActivity(activityData)
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      subtitle: `+${stats.newUsersToday} today`,
      icon: '👥',
      color: 'from-blue-500 to-indigo-600',
      bgColor: 'from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30',
      borderColor: 'border-blue-200 dark:border-blue-600'
    },
    {
      title: 'Total Revenue',
      value: `R${stats.totalRevenue.toLocaleString()}`,
      subtitle: `R${stats.todayRevenue} today`,
      icon: '💰',
      color: 'from-emerald-500 to-teal-600',
      bgColor: 'from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30',
      borderColor: 'border-emerald-200 dark:border-emerald-600'
    },
    {
      title: 'Total Trips',
      value: stats.totalTrips,
      subtitle: `${stats.activeTrips} active`,
      icon: '🚐',
      color: 'from-purple-500 to-pink-600',
      bgColor: 'from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30',
      borderColor: 'border-purple-200 dark:border-purple-600'
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings,
      subtitle: `${stats.todayBookings} today`,
      icon: '📋',
      color: 'from-amber-500 to-orange-600',
      bgColor: 'from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30',
      borderColor: 'border-amber-200 dark:border-amber-600'
    },
    {
      title: 'Credits in System',
      value: stats.totalCurrentCredits,
      subtitle: `${stats.totalCreditsIssued} issued total`,
      icon: '💳',
      color: 'from-cyan-500 to-blue-600',
      bgColor: 'from-cyan-50 to-blue-50 dark:from-cyan-900/30 dark:to-blue-900/30',
      borderColor: 'border-cyan-200 dark:border-cyan-600'
    },
    {
      title: 'Trip Utilization',
      value: `${stats.utilizationRate}%`,
      subtitle: `${stats.avgBookingsPerUser} avg/user`,
      icon: '📊',
      color: 'from-green-500 to-emerald-600',
      bgColor: 'from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/30',
      borderColor: 'border-green-200 dark:border-green-600'
    },
    {
      title: 'Active Users',
      value: stats.activeUsersWithCredits,
      subtitle: `${stats.usersWithBookings} with bookings`,
      icon: '⚡',
      color: 'from-yellow-500 to-amber-600',
      bgColor: 'from-yellow-50 to-amber-50 dark:from-yellow-900/30 dark:to-amber-900/30',
      borderColor: 'border-yellow-200 dark:border-yellow-600'
    },
    {
      title: 'This Week',
      value: stats.weeklyBookings,
      subtitle: `${stats.newUsersThisWeek} new users`,
      icon: '📅',
      color: 'from-rose-500 to-pink-600',
      bgColor: 'from-rose-50 to-pink-50 dark:from-rose-900/30 dark:to-pink-900/30',
      borderColor: 'border-rose-200 dark:border-rose-600'
    }
  ]

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Welcome back! Here&apos;s an overview of your shuttle service.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((card, index) => (
            <div
              key={index}
              className={`bg-gradient-to-r ${card.bgColor} border-2 ${card.borderColor} rounded-2xl p-6 backdrop-blur-sm hover:shadow-lg transition-all duration-200`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                    {typeof card.value === 'string' ? card.value : card.value.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {card.subtitle}
                  </p>
                </div>
                <div className={`w-12 h-12 bg-gradient-to-r ${card.color} rounded-xl flex items-center justify-center ml-4 flex-shrink-0`}>
                  <span className="text-white text-xl">{card.icon}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Upcoming Trips */}
        {stats.upcomingTrips.length > 0 && (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Upcoming Trips</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">Next 5 trips</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {stats.upcomingTrips.map((trip) => (
                <div key={trip.id} className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-200 dark:border-indigo-600 rounded-xl p-4">
                  <div className="text-center">
                    <h3 className="font-semibold text-indigo-900 dark:text-indigo-200 text-sm mb-2">
                      {trip.destination}
                    </h3>
                    <p className="text-xs text-indigo-700 dark:text-indigo-400 mb-2">
                      {new Date(trip.startTime).toLocaleDateString()} • {new Date(trip.startTime).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    <div className="flex items-center justify-center space-x-1 text-xs">
                      <span className="text-indigo-600 dark:text-indigo-400">{trip.bookings}</span>
                      <span className="text-indigo-500 dark:text-indigo-500">/</span>
                      <span className="text-indigo-600 dark:text-indigo-400">{trip.maxPassengers}</span>
                      <span className="text-indigo-500 dark:text-indigo-500">👥</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Recent Activity</h2>
              <span className="text-sm text-gray-500 dark:text-gray-400">Last 24 hours</span>
            </div>
            
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {recentActivity.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  No recent activity
                </p>
              ) : (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      activity.type === 'booking' ? 'bg-blue-100 dark:bg-blue-900/30' :
                      activity.type === 'trip' ? 'bg-green-100 dark:bg-green-900/30' :
                      activity.type === 'user' ? 'bg-purple-100 dark:bg-purple-900/30' :
                      'bg-amber-100 dark:bg-amber-900/30'
                    }`}>
                      <span className="text-sm">
                        {activity.type === 'booking' ? '📋' :
                         activity.type === 'trip' ? '🚐' :
                         activity.type === 'user' ? '👤' : '💳'}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900 dark:text-white">{activity.description}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(activity.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Quick Actions</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => router.push('/admin/trips')}
                className="p-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <div className="text-2xl mb-2">🚐</div>
                <div className="text-sm font-medium">Create Trip</div>
              </button>
              
              <button 
                onClick={() => router.push('/admin/users')}
                className="p-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <div className="text-2xl mb-2">👥</div>
                <div className="text-sm font-medium">Manage Users</div>
              </button>
              
              <button 
                onClick={() => router.push('/admin/credits')}
                className="p-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <div className="text-2xl mb-2">💳</div>
                <div className="text-sm font-medium">Credit Management</div>
              </button>
              
              <button 
                onClick={() => router.push('/admin/reports')}
                className="p-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <div className="text-2xl mb-2">📊</div>
                <div className="text-sm font-medium">View Reports</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}