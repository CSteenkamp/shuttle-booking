/**
 * Driver Performance Dashboard
 * Shows comprehensive KPIs, badges, and leaderboard
 */

'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import toast from 'react-hot-toast'
import { MetricCard, RatingDistribution, ProgressBar, StatComparison } from '@/components/PerformanceMetrics'
import BadgeDisplay, { BadgeShowcase } from '@/components/BadgeDisplay'

interface PerformanceMetrics {
  acceptanceRate: number
  completionRate: number
  onTimeRate: number
  averageResponseTime: number
  totalAssignments: number
  totalAccepted: number
  totalCompleted: number
  totalDeclined: number
  totalCancelled: number
  averageRating: number
  totalRatings: number
  ratingDistribution: Record<number, number>
  currentStreak: number
  longestStreak: number
  totalEarnings: number
  averageEarningPerTrip: number
  recentAcceptanceRate: number
  recentCompletionRate: number
  recentTripsCount: number
}

interface Badge {
  id: string
  type: string
  name: string
  description: string
  icon: string
  earnedAt: Date
  level?: number
}

interface Insights {
  strengths: string[]
  improvementAreas: string[]
  nextMilestone?: {
    type: string
    current: number
    target: number
    progress: number
  }
}

export default function DriverPerformance() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [badges, setBadges] = useState<Badge[]>([])
  const [insights, setInsights] = useState<Insights | null>(null)
  const [newBadges, setNewBadges] = useState<Badge[]>([])
  const [showBadgeModal, setShowBadgeModal] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/auth/signin')
    }

    if (status === 'authenticated') {
      fetchData()
    }
  }, [status])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch metrics
      const metricsRes = await fetch('/api/driver/metrics')
      const metricsData = await metricsRes.json()

      if (metricsData.success) {
        setMetrics(metricsData.metrics)

        // Check for new badges
        if (metricsData.newBadges && metricsData.newBadges.length > 0) {
          setNewBadges(metricsData.newBadges)
          setShowBadgeModal(true)
        }
      }

      // Fetch badges
      const badgesRes = await fetch('/api/driver/badges')
      const badgesData = await badgesRes.json()

      if (badgesData.success) {
        setBadges(badgesData.badges)
      }

      // Fetch insights
      const insightsRes = await fetch('/api/driver/insights')
      const insightsData = await insightsRes.json()

      if (insightsData.success) {
        setInsights(insightsData.insights)
      }
    } catch (error) {
      console.error('Error fetching performance data:', error)
      toast.error('Failed to load performance data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading performance data...</p>
        </div>
      </div>
    )
  }

  if (!metrics || !insights) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
            <p className="text-red-800 dark:text-red-300">
              Failed to load performance data. Please try again later.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Performance Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Track your KPIs and achievements
            </p>
          </div>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
          >
            🔄 Refresh
          </button>
        </div>

        {/* Streak & Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <MetricCard
            label="Current Streak"
            value={metrics.currentStreak}
            subtext={`Longest: ${metrics.longestStreak} days`}
            icon="🔥"
            color="yellow"
          />
          <MetricCard
            label="Acceptance Rate"
            value={`${metrics.acceptanceRate}%`}
            subtext="All time"
            icon="✅"
            color={metrics.acceptanceRate >= 90 ? 'green' : metrics.acceptanceRate >= 70 ? 'yellow' : 'red'}
          />
          <MetricCard
            label="Completion Rate"
            value={`${metrics.completionRate}%`}
            subtext="Of accepted trips"
            icon="🏁"
            color={metrics.completionRate >= 95 ? 'green' : metrics.completionRate >= 85 ? 'yellow' : 'red'}
          />
          <MetricCard
            label="Average Rating"
            value={metrics.averageRating.toFixed(1)}
            subtext={`${metrics.totalRatings} reviews`}
            icon="⭐"
            color={metrics.averageRating >= 4.5 ? 'green' : metrics.averageRating >= 4.0 ? 'yellow' : 'red'}
          />
        </div>

        {/* Performance Insights */}
        {insights && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              📊 Performance Insights
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Strengths */}
              {insights.strengths.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-3 flex items-center">
                    <span className="text-2xl mr-2">💪</span>
                    Strengths
                  </h3>
                  <ul className="space-y-2">
                    {insights.strengths.map((strength, index) => (
                      <li
                        key={index}
                        className="flex items-start space-x-2 text-gray-700 dark:text-gray-300"
                      >
                        <span className="text-green-500">✓</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvement Areas */}
              {insights.improvementAreas.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-300 mb-3 flex items-center">
                    <span className="text-2xl mr-2">🎯</span>
                    Areas to Improve
                  </h3>
                  <ul className="space-y-2">
                    {insights.improvementAreas.map((area, index) => (
                      <li
                        key={index}
                        className="flex items-start space-x-2 text-gray-700 dark:text-gray-300"
                      >
                        <span className="text-yellow-500">→</span>
                        <span>{area}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Next Milestone */}
            {insights.nextMilestone && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  🎯 Next Milestone
                </h3>
                <ProgressBar
                  label={`Complete ${insights.nextMilestone.target} trips`}
                  current={insights.nextMilestone.current}
                  target={insights.nextMilestone.target}
                  unit="trips"
                  color="purple"
                />
              </div>
            )}
          </div>
        )}

        {/* Detailed Metrics Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Response Time & On-Time Rate */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              ⏱️ Speed & Punctuality
            </h2>
            <div className="space-y-4">
              <MetricCard
                label="Average Response Time"
                value={metrics.averageResponseTime}
                subtext="Minutes to accept/decline"
                color={metrics.averageResponseTime <= 2 ? 'green' : metrics.averageResponseTime <= 5 ? 'yellow' : 'red'}
              />
              <MetricCard
                label="On-Time Rate"
                value={`${metrics.onTimeRate}%`}
                subtext="Started within 5 min of scheduled"
                color={metrics.onTimeRate >= 90 ? 'green' : metrics.onTimeRate >= 75 ? 'yellow' : 'red'}
              />
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              ⭐ Rating Breakdown
            </h2>
            <RatingDistribution distribution={metrics.ratingDistribution} />
          </div>
        </div>

        {/* All Time vs Recent */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            📈 Performance Trends
          </h2>
          <div className="grid md:grid-cols-3 gap-4">
            <StatComparison
              label="Acceptance Rate"
              allTime={metrics.acceptanceRate}
              recent={metrics.recentAcceptanceRate}
              format="percentage"
            />
            <StatComparison
              label="Completion Rate"
              allTime={metrics.completionRate}
              recent={metrics.recentCompletionRate}
              format="percentage"
            />
            <StatComparison
              label="Trips Completed"
              allTime={metrics.totalCompleted}
              recent={metrics.recentTripsCount}
              format="number"
            />
          </div>
        </div>

        {/* Trip Statistics */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            📊 Trip Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {metrics.totalAssignments}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Total Assigned
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {metrics.totalAccepted}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Accepted
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">
                {metrics.totalCompleted}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Completed
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-red-600">
                {metrics.totalDeclined}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Declined
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-600">
                {metrics.totalCancelled}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Cancelled
              </p>
            </div>
          </div>
        </div>

        {/* Earnings Summary */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg shadow-md p-6 text-white">
          <h2 className="text-xl font-bold mb-4">💰 Earnings Performance</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm opacity-90 mb-1">Total Earnings</p>
              <p className="text-4xl font-bold">
                R{metrics.totalEarnings.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm opacity-90 mb-1">Average Per Trip</p>
              <p className="text-4xl font-bold">
                R{metrics.averageEarningPerTrip.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Badges Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            🏆 Badges & Achievements
          </h2>
          <BadgeDisplay badges={badges} />
        </div>

        {/* Help Section */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
            💡 How to Improve Your Performance
          </h3>
          <ul className="space-y-2 text-blue-800 dark:text-blue-300 text-sm">
            <li>• <strong>Accept more trips:</strong> Higher acceptance rate shows reliability</li>
            <li>• <strong>Complete accepted trips:</strong> Avoid cancelling trips you've accepted</li>
            <li>• <strong>Be punctual:</strong> Start trips on time for better customer experience</li>
            <li>• <strong>Respond quickly:</strong> Accept or decline assignments within 2 minutes</li>
            <li>• <strong>Maintain quality:</strong> Provide excellent service for better ratings</li>
            <li>• <strong>Build streaks:</strong> Complete at least one trip daily for consistency</li>
          </ul>
        </div>
      </div>

      {/* New Badge Modal */}
      {showBadgeModal && newBadges.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-md w-full">
            <BadgeShowcase badge={newBadges[0]} />
            <button
              onClick={() => {
                if (newBadges.length > 1) {
                  setNewBadges(newBadges.slice(1))
                } else {
                  setShowBadgeModal(false)
                  setNewBadges([])
                }
              }}
              className="w-full mt-4 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold"
            >
              {newBadges.length > 1 ? 'Next Badge' : 'Awesome!'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
