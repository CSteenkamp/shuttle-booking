'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { RatingDisplay, StarDistribution } from '@/components/RatingStars'

interface Rating {
  id: string
  stars: number
  comment?: string
  tags: string[]
  createdAt: string
  trip: {
    id: string
    startTime: string
    destination: {
      name: string
    }
  }
}

interface Statistics {
  total: number
  average: number
  starDistribution: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
  topTags: Array<{
    tag: string
    count: number
  }>
}

export default function DriverRatings() {
  const { data: session, status } = useSession()
  const [ratings, setRatings] = useState<Rating[]>([])
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'DRIVER') {
      redirect('/auth/signin')
    }
  }, [session, status])

  useEffect(() => {
    if (session?.user.driverProfileId) {
      fetchRatings()
    }
  }, [session])

  const fetchRatings = async () => {
    try {
      const driverId = session?.user.driverProfileId
      if (!driverId) return

      const response = await fetch(`/api/ratings/driver/${driverId}`)
      if (response.ok) {
        const data = await response.json()
        setRatings(data.ratings)
        setStatistics(data.statistics)
      }
    } catch (error) {
      console.error('Error fetching ratings:', error)
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-indigo-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!session) {
    return null
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
                  <span className="text-white font-bold text-sm">⭐</span>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  My Ratings
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
                href="/driver/earnings"
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Earnings
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Your Ratings
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            See what customers are saying about you
          </p>
        </div>

        {statistics && (
          <>
            {/* Overall Rating Card */}
            <div className="mb-8 bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl shadow-xl border border-yellow-200 dark:border-yellow-800 p-8">
              <div className="text-center">
                <div className="text-6xl font-bold text-gray-900 dark:text-white mb-2">
                  {statistics.average.toFixed(1)}
                </div>
                <RatingDisplay
                  rating={statistics.average}
                  count={statistics.total}
                  size="lg"
                />
                <p className="text-gray-600 dark:text-gray-400 mt-4">
                  Based on {statistics.total} customer rating{statistics.total !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Star Distribution */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Rating Distribution
                </h3>
                <StarDistribution distribution={statistics.starDistribution} />
              </div>

              {/* Top Tags */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                  Top Compliments
                </h3>
                {statistics.topTags.length > 0 ? (
                  <div className="space-y-3">
                    {statistics.topTags.map(({ tag, count }, index) => (
                      <div key={tag} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📍'}</span>
                          <span className="font-medium text-gray-900 dark:text-white">{tag}</span>
                        </div>
                        <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 rounded-full text-sm font-semibold">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                    No tags yet
                  </p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Individual Ratings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              All Reviews ({ratings.length})
            </h3>
          </div>

          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {ratings.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">⭐</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  No ratings yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Complete trips to start receiving ratings from customers
                </p>
              </div>
            ) : (
              ratings.map((rating) => (
                <div key={rating.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <RatingDisplay rating={rating.stars} size="sm" />
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {format(new Date(rating.createdAt), 'MMM d, yyyy')} • {rating.trip.destination.name}
                      </p>
                    </div>
                  </div>

                  {rating.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {rating.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {rating.comment && (
                    <p className="text-gray-700 dark:text-gray-300 italic">
                      "{rating.comment}"
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Motivation Section */}
        {statistics && statistics.average >= 4.5 && (
          <div className="mt-8 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              You're a Top Rated Driver!
            </h4>
            <p className="text-gray-600 dark:text-gray-300">
              Keep up the excellent service. Your high ratings make you stand out!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
