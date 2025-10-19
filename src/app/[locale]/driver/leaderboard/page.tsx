/**
 * Driver Leaderboard Page
 * Shows city-wide driver rankings with multiple metrics
 */

'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import Leaderboard from '@/components/Leaderboard'
import { prisma } from '@/lib/prisma'

export default function DriverLeaderboardPage() {
  const { data: session, status } = useSession()
  const [cityId, setCityId] = useState<string | null>(null)
  const [driverId, setDriverId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }

    if (status === 'authenticated') {
      fetchDriverInfo()
    }
  }, [status])

  const fetchDriverInfo = async () => {
    try {
      const response = await fetch('/api/driver/profile')
      const data = await response.json()

      if (data.success && data.profile) {
        setCityId(data.profile.cityId)
        setDriverId(data.profile.id)
      }
    } catch (error) {
      console.error('Error fetching driver info:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!cityId) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <p className="text-red-800 dark:text-red-300">
              Unable to load leaderboard. Driver city information not found.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Driver Leaderboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Compete with other drivers in your city and climb the ranks!
          </p>
        </div>

        {/* Leaderboard Component */}
        <Leaderboard cityId={cityId} currentDriverId={driverId || undefined} />

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <div className="text-3xl mb-2">🚗</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Trips Leaderboard
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Based on total completed trips
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <div className="text-3xl mb-2">⭐</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Rating Leaderboard
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Based on average customer rating (min. 5 reviews)
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
            <div className="text-3xl mb-2">💰</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
              Earnings Leaderboard
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Based on total lifetime earnings
            </p>
          </div>
        </div>

        {/* Tips */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow-md p-6 text-white">
          <h2 className="text-xl font-bold mb-4">🎯 How to Climb the Ranks</h2>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start space-x-2">
              <span>✓</span>
              <span><strong>Complete more trips:</strong> Accept and finish as many trips as possible</span>
            </li>
            <li className="flex items-start space-x-2">
              <span>✓</span>
              <span><strong>Maintain high ratings:</strong> Provide excellent service to every customer</span>
            </li>
            <li className="flex items-start space-x-2">
              <span>✓</span>
              <span><strong>Be consistent:</strong> Complete trips daily to maximize earnings</span>
            </li>
            <li className="flex items-start space-x-2">
              <span>✓</span>
              <span><strong>Stay punctual:</strong> Arrive on time to build trust</span>
            </li>
            <li className="flex items-start space-x-2">
              <span>✓</span>
              <span><strong>Respond quickly:</strong> Accept assignments fast to show reliability</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
