/**
 * Performance Metrics Display Components
 * Shows driver KPIs and statistics
 */

'use client'

interface MetricCardProps {
  label: string
  value: string | number
  subtext?: string
  icon?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: 'green' | 'blue' | 'yellow' | 'red' | 'purple'
}

export function MetricCard({
  label,
  value,
  subtext,
  icon,
  trend,
  color = 'blue'
}: MetricCardProps) {
  const colorClasses = {
    green: 'from-green-500 to-emerald-600',
    blue: 'from-blue-500 to-indigo-600',
    yellow: 'from-yellow-500 to-orange-600',
    red: 'from-red-500 to-pink-600',
    purple: 'from-purple-500 to-violet-600'
  }

  const trendIcons = {
    up: '📈',
    down: '📉',
    neutral: '➡️'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className={`bg-gradient-to-r ${colorClasses[color]} p-4`}>
        <div className="flex items-center justify-between text-white">
          <span className="text-sm font-medium opacity-90">{label}</span>
          {icon && <span className="text-2xl">{icon}</span>}
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-baseline space-x-2">
          <span className="text-3xl font-bold text-gray-900 dark:text-white">
            {value}
          </span>
          {trend && (
            <span className="text-lg">{trendIcons[trend]}</span>
          )}
        </div>
        {subtext && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {subtext}
          </p>
        )}
      </div>
    </div>
  )
}

interface RatingDistributionProps {
  distribution: Record<number, number>
}

export function RatingDistribution({ distribution }: RatingDistributionProps) {
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0)

  if (total === 0) {
    return (
      <div className="text-center py-4 text-gray-500 dark:text-gray-400">
        <p>No ratings yet</p>
      </div>
    )
  }

  const stars = [5, 4, 3, 2, 1]

  return (
    <div className="space-y-2">
      {stars.map((star) => {
        const count = distribution[star] || 0
        const percentage = total > 0 ? (count / total) * 100 : 0

        return (
          <div key={star} className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-8">
              {star}⭐
            </span>
            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-yellow-400 to-orange-500 h-full transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">
              {count}
            </span>
          </div>
        )
      })}
    </div>
  )
}

interface ProgressBarProps {
  label: string
  current: number
  target: number
  unit?: string
  color?: 'green' | 'blue' | 'yellow' | 'purple'
}

export function ProgressBar({
  label,
  current,
  target,
  unit = '',
  color = 'blue'
}: ProgressBarProps) {
  const percentage = Math.min((current / target) * 100, 100)

  const colorClasses = {
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    yellow: 'bg-yellow-500',
    purple: 'bg-purple-500'
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </span>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {current} / {target} {unit}
        </span>
      </div>
      <div className="bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
        <div
          className={`${colorClasses[color]} h-full transition-all duration-500 rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-500 text-right">
        {Math.round(percentage)}% complete
      </p>
    </div>
  )
}

interface StatComparisonProps {
  label: string
  allTime: number
  recent: number
  unit?: string
  format?: 'number' | 'percentage' | 'currency'
}

export function StatComparison({
  label,
  allTime,
  recent,
  unit = '',
  format = 'number'
}: StatComparisonProps) {
  const formatValue = (value: number) => {
    switch (format) {
      case 'percentage':
        return `${value}%`
      case 'currency':
        return `R${value.toLocaleString()}`
      default:
        return value.toLocaleString()
    }
  }

  const trend = recent > allTime ? 'up' : recent < allTime ? 'down' : 'neutral'
  const trendColor = trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        {label}
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">All Time</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">
            {formatValue(allTime)} {unit}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-1">Last 30 Days</p>
          <p className={`text-lg font-bold ${trendColor}`}>
            {formatValue(recent)} {unit}
          </p>
        </div>
      </div>
    </div>
  )
}
