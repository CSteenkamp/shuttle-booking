'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface EarningsSummary {
  allTime: {
    gross: number
    platformFee: number
    net: number
    trips: number
    avgPerTrip: number
  }
  today: {
    gross: number
    net: number
    trips: number
  }
  week: {
    gross: number
    net: number
    trips: number
  }
  month: {
    gross: number
    net: number
    trips: number
  }
  payout: {
    pending: number
    paid: number
  }
  profile: {
    totalEarnings: number
    completedTrips: number
    averageRating: number | null
  }
}

interface Transaction {
  id: string
  tripId: string
  bookingId: string | null
  tripDate: string
  baseAmount: number
  distanceAmount: number
  timeAmount: number
  totalAmount: number
  platformFee: number
  netAmount: number
  payoutStatus: string
  paidAt: string | null
  passengerCount: number | null
  distance: number | null
  duration: number | null
  createdAt: string
}

export default function DriverEarnings() {
  const { data: session, status } = useSession()
  const [summary, setSummary] = useState<EarningsSummary | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all')
  const [exporting, setExporting] = useState(false)

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
  }, [session, filter])

  const fetchData = async () => {
    try {
      // Fetch summary
      const summaryRes = await fetch('/api/driver/earnings/summary')
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json()
        setSummary(summaryData.summary)
      }

      // Fetch transactions
      const statusParam = filter === 'all' ? '' : `&status=${filter.toUpperCase()}`
      const transactionsRes = await fetch(`/api/driver/earnings/transactions?limit=100${statusParam}`)
      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json()
        setTransactions(transactionsData.transactions || [])
      }
    } catch (error) {
      console.error('Error fetching earnings:', error)
      toast.error('Failed to load earnings data')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const statusParam = filter === 'all' ? '' : `?status=${filter.toUpperCase()}`
      const response = await fetch(`/api/driver/earnings/export${statusParam}`)

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `earnings_${format(new Date(), 'yyyy-MM-dd')}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success('Earnings exported successfully')
      } else {
        toast.error('Failed to export earnings')
      }
    } catch (error) {
      console.error('Error exporting:', error)
      toast.error('Error exporting earnings')
    } finally {
      setExporting(false)
    }
  }

  const formatMoney = (amount: number) => {
    return `R${(amount / 100).toFixed(2)}`
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!session || !summary) {
    return null
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'PROCESSING': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'PAID': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-indigo-900">
      {/* Navigation */}
      <nav className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/driver/dashboard" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">💰</span>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  My Earnings
                </h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/driver/dashboard"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Dashboard
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
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Earnings Overview
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Track your income and payout status
          </p>
        </div>

        {/* Summary Cards - Period Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Today */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Today</h3>
              <div className="text-2xl">📅</div>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {formatMoney(summary.today.net)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {summary.today.trips} trip{summary.today.trips !== 1 ? 's' : ''}
            </div>
          </div>

          {/* This Week */}
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">This Week</h3>
              <div className="text-2xl">📊</div>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {formatMoney(summary.week.net)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {summary.week.trips} trip{summary.week.trips !== 1 ? 's' : ''}
            </div>
          </div>

          {/* This Month */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">This Month</h3>
              <div className="text-2xl">📈</div>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {formatMoney(summary.month.net)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {summary.month.trips} trip{summary.month.trips !== 1 ? 's' : ''}
            </div>
          </div>

          {/* All Time */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-xl p-6 border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-300">All Time</h3>
              <div className="text-2xl">💎</div>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {formatMoney(summary.allTime.net)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {summary.allTime.trips} trip{summary.allTime.trips !== 1 ? 's' : ''} • Avg {formatMoney(summary.allTime.avgPerTrip)}
            </div>
          </div>
        </div>

        {/* Payout Status */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Pending Payout</h3>
              <div className="text-3xl">⏳</div>
            </div>
            <div className="text-4xl font-bold text-yellow-600 dark:text-yellow-400 mb-2">
              {formatMoney(summary.payout.pending)}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Available for next payout cycle
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Total Paid Out</h3>
              <div className="text-3xl">✅</div>
            </div>
            <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
              {formatMoney(summary.payout.paid)}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Successfully transferred to your account
            </p>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Transaction History
              </h3>
              <button
                onClick={handleExport}
                disabled={exporting || transactions.length === 0}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <span>{exporting ? 'Exporting...' : '📥 Export CSV'}</span>
              </button>
            </div>

            {/* Filters */}
            <div className="flex space-x-2">
              {['all', 'pending', 'paid'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f as any)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === f
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Trip
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Passengers
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Gross
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Fee
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Net
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {format(new Date(transaction.tripDate), 'MMM d, yyyy')}
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {format(new Date(transaction.tripDate), 'h:mm a')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
                        <div className="font-mono text-xs">{transaction.tripId.substring(0, 8)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {transaction.passengerCount || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                        {formatMoney(transaction.totalAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400">
                        -{formatMoney(transaction.platformFee)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600 dark:text-green-400">
                        {formatMoney(transaction.netAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(transaction.payoutStatus)}`}>
                          {transaction.payoutStatus}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800">
          <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
            💡 About Your Earnings
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
            <li>• <strong>Platform Fee:</strong> 15% commission on all trips</li>
            <li>• <strong>Pending:</strong> Earnings awaiting next payout cycle</li>
            <li>• <strong>Payout Schedule:</strong> Weekly on Fridays (minimum R50)</li>
            <li>• <strong>Need help?</strong> Contact support for payout questions</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
