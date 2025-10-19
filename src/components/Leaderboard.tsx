/**
 * Leaderboard Component
 * Shows top performing drivers in a city
 */

'use client'

import { useState } from 'react'

interface LeaderboardEntry {
  rank: number
  driverId: string
  driverName: string
  value: number
  badge?: string
}

interface LeaderboardProps {
  cityId: string
  currentDriverId?: string
}

export default function Leaderboard({ cityId, currentDriverId }: LeaderboardProps) {
  const [metric, setMetric] = useState<'trips' | 'rating' | 'earnings'>('trips')
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(false)

  const fetchLeaderboard = async (selectedMetric: typeof metric) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/leaderboard/${cityId}?metric=${selectedMetric}&limit=10`)
      const data = await response.json()

      if (data.success) {
        setLeaderboard(data.leaderboard)
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleMetricChange = (newMetric: typeof metric) => {
    setMetric(newMetric)
    fetchLeaderboard(newMetric)
  }

  // Initial load
  if (leaderboard.length === 0 && !loading) {
    fetchLeaderboard(metric)
  }

  const getMetricLabel = (m: typeof metric) => {
    switch (m) {
      case 'trips':
        return 'Total Trips'
      case 'rating':
        return 'Average Rating'
      case 'earnings':
        return 'Total Earnings'
    }
  }

  const formatValue = (value: number, m: typeof metric) => {
    switch (m) {
      case 'trips':
        return value.toString()
      case 'rating':
        return `${value.toFixed(1)}⭐`
      case 'earnings':
        return `R${value.toLocaleString()}`
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-500 to-indigo-600 p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">🏆 City Leaderboard</h2>
        <p className="text-purple-100">
          Top 10 drivers in your city
        </p>
      </div>

      {/* Metric Selector */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <button
            onClick={() => handleMetricChange('trips')}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
              metric === 'trips'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            🚗 Trips
          </button>
          <button
            onClick={() => handleMetricChange('rating')}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
              metric === 'rating'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            ⭐ Rating
          </button>
          <button
            onClick={() => handleMetricChange('earnings')}
            className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-colors ${
              metric === 'earnings'
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            💰 Earnings
          </button>
        </div>
      </div>

      {/* Leaderboard List */}
      {loading ? (
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading leaderboard...</p>
        </div>
      ) : leaderboard.length === 0 ? (
        <div className="p-8 text-center text-gray-500 dark:text-gray-400">
          <p>No data available yet</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {leaderboard.map((entry) => {
            const isCurrentDriver = entry.driverId === currentDriverId
            const rankColor =
              entry.rank === 1
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                : entry.rank === 2
                ? 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                : entry.rank === 3
                ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'

            return (
              <div
                key={entry.driverId}
                className={`p-4 flex items-center space-x-4 ${
                  isCurrentDriver
                    ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-600'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                }`}
              >
                {/* Rank Badge */}
                <div
                  className={`flex-shrink-0 w-12 h-12 rounded-full ${rankColor} flex items-center justify-center font-bold text-lg`}
                >
                  {entry.badge || `#${entry.rank}`}
                </div>

                {/* Driver Info */}
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {entry.driverName}
                    </p>
                    {isCurrentDriver && (
                      <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 text-xs font-medium rounded">
                        You
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {getMetricLabel(metric)}
                  </p>
                </div>

                {/* Value */}
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900 dark:text-white">
                    {formatValue(entry.value, metric)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer */}
      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
          Rankings updated in real-time. Keep up the great work! 🚀
        </p>
      </div>
    </div>
  )
}

export function LeaderboardMini({ cityId, currentDriverId, metric = 'trips' }: LeaderboardProps & { metric?: 'trips' | 'rating' | 'earnings' }) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch(`/api/leaderboard/${cityId}?metric=${metric}&limit=3`)
      const data = await response.json()

      if (data.success) {
        setLeaderboard(data.leaderboard)
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (leaderboard.length === 0 && !loading) {
    fetchLeaderboard()
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
        🏆 Top Drivers
      </h3>
      <div className="space-y-2">
        {leaderboard.map((entry) => (
          <div
            key={entry.driverId}
            className="flex items-center space-x-2 text-sm"
          >
            <span className="text-lg">{entry.badge}</span>
            <span className={`font-medium ${entry.driverId === currentDriverId ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}>
              {entry.driverName}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
