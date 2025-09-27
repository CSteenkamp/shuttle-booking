'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'

interface AuditLog {
  id: string
  action: string
  resource: string
  resourceId?: string
  description?: string
  success: boolean
  errorMessage?: string
  ipAddress?: string
  userAgent?: string
  method?: string
  path?: string
  createdAt: string
  user: {
    name: string
    email: string
    role: string
  }
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
}

interface AuditStats {
  totalActions: number
  failedActions: number
  successRate: number
  actionsByType: Array<{ action: string; count: number }>
  resourceStats: Array<{ resource: string; count: number }>
  topUsers: Array<{ userId: string; actionCount: number }>
}

export default function AuditLogsPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [filters, setFilters] = useState({
    resource: '',
    action: '',
    userId: '',
    startDate: '',
    endDate: ''
  })
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const logsPerPage = 50

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      redirect('/admin')
    }
  }, [session, status])

  useEffect(() => {
    if (session) {
      fetchLogs()
      fetchStats()
    }
  }, [session, filters, currentPage])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: logsPerPage.toString(),
        offset: ((currentPage - 1) * logsPerPage).toString()
      })

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value)
      })

      const response = await fetch(`/api/admin/audit?${params}`)
      if (response.ok) {
        const data = await response.json()
        if (currentPage === 1) {
          setLogs(data)
        } else {
          setLogs(prev => [...prev, ...data])
        }
        setHasMore(data.length === logsPerPage)
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      toast.error('Failed to load audit logs')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams()
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)
      if (filters.userId) params.set('userId', filters.userId)

      const response = await fetch(`/api/admin/audit/stats?${params}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching audit stats:', error)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1)
    setLogs([])
  }

  const loadMore = () => {
    setCurrentPage(prev => prev + 1)
  }

  const cleanupOldLogs = async () => {
    if (!confirm('Are you sure you want to delete audit logs older than 90 days? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch('/api/admin/audit?days=90', { method: 'DELETE' })
      if (response.ok) {
        const { deletedCount } = await response.json()
        toast.success(`Deleted ${deletedCount} old audit logs`)
        fetchLogs()
        fetchStats()
      } else {
        toast.error('Failed to cleanup old logs')
      }
    } catch (error) {
      console.error('Error cleaning up logs:', error)
      toast.error('Failed to cleanup old logs')
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400'
      case 'UPDATE': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400'
      case 'DELETE': return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400'
      case 'LOGIN': return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400'
      case 'LOGOUT': return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30 dark:text-gray-400'
      default: return 'text-indigo-600 bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400'
    }
  }

  const getResourceIcon = (resource: string) => {
    switch (resource) {
      case 'bookings': return '📋'
      case 'trips': return '🚐'
      case 'users': return '👥'
      case 'settings': return '⚙️'
      case 'credits': return '💳'
      case 'locations': return '📍'
      case 'auth': return '🔐'
      case 'security': return '🔒'
      default: return '📄'
    }
  }

  if (status === 'loading' || loading && logs.length === 0) {
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
              📜 Audit Logs
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              System activity logs and security audit trail
            </p>
          </div>
          <button
            onClick={cleanupOldLogs}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            🗑️ Cleanup Old Logs
          </button>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {stats.totalActions.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Actions</div>
              </div>
            </div>
            
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {stats.successRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Success Rate</div>
              </div>
            </div>
            
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {stats.failedActions.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Failed Actions</div>
              </div>
            </div>
            
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {stats.actionsByType.length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Action Types</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Resource
              </label>
              <select
                value={filters.resource}
                onChange={(e) => handleFilterChange('resource', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Resources</option>
                <option value="bookings">Bookings</option>
                <option value="trips">Trips</option>
                <option value="users">Users</option>
                <option value="settings">Settings</option>
                <option value="credits">Credits</option>
                <option value="locations">Locations</option>
                <option value="auth">Authentication</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Action
              </label>
              <select
                value={filters.action}
                onChange={(e) => handleFilterChange('action', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="LOGIN">Login</option>
                <option value="LOGOUT">Logout</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                User ID
              </label>
              <input
                type="text"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
                placeholder="Enter user ID"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Audit Logs */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Log</h3>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <div className="text-4xl mb-2">📜</div>
                <div>No audit logs found for the selected filters</div>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-start space-x-3">
                      {/* Resource Icon */}
                      <div className="text-2xl">
                        {getResourceIcon(log.resource)}
                      </div>
                      
                      {/* Log Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                            {log.action}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {log.resource}
                          </span>
                          {log.resourceId && (
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              #{log.resourceId.slice(0, 8)}...
                            </span>
                          )}
                          {!log.success && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                              Failed
                            </span>
                          )}
                        </div>
                        
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {log.description || `${log.action} ${log.resource}`}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                          <div className="flex items-center space-x-4">
                            <span>👤 {log.user.name}</span>
                            <span>🌐 {log.ipAddress}</span>
                            {log.method && <span>📡 {log.method}</span>}
                          </div>
                          <span>
                            {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        
                        {log.errorMessage && (
                          <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-400">
                            Error: {log.errorMessage}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Load More */}
          {hasMore && logs.length > 0 && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 text-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}