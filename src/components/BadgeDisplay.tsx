/**
 * Badge Display Components
 * Shows driver badges and achievements
 */

'use client'

import { BadgeType } from '@prisma/client'

interface Badge {
  id: string
  type: BadgeType
  name: string
  description: string
  icon: string
  earnedAt: Date
  level?: number
}

interface BadgeDisplayProps {
  badges: Badge[]
  size?: 'sm' | 'md' | 'lg'
  showDescription?: boolean
}

export default function BadgeDisplay({
  badges,
  size = 'md',
  showDescription = true
}: BadgeDisplayProps) {
  if (badges.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p className="text-lg mb-2">No badges yet</p>
        <p className="text-sm">Complete trips and maintain high ratings to earn badges!</p>
      </div>
    )
  }

  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl'
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {badges.map((badge) => (
        <div
          key={badge.id}
          className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-4 text-center hover:scale-105 transition-transform"
        >
          <div className={`${sizeClasses[size]} mb-2`}>{badge.icon}</div>
          <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-1">
            {badge.name}
          </h3>
          {showDescription && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              {badge.description}
            </p>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-500">
            {new Date(badge.earnedAt).toLocaleDateString()}
          </p>
        </div>
      ))}
    </div>
  )
}

export function BadgeShowcase({ badge }: { badge: Badge }) {
  return (
    <div className="bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/30 dark:to-orange-900/30 border-2 border-yellow-400 dark:border-yellow-600 rounded-xl p-6 text-center">
      <div className="text-8xl mb-4 animate-bounce">{badge.icon}</div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Badge Earned!
      </h2>
      <h3 className="text-xl font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
        {badge.name}
      </h3>
      <p className="text-gray-700 dark:text-gray-300">
        {badge.description}
      </p>
    </div>
  )
}

export function BadgeMini({ badges, maxDisplay = 3 }: { badges: Badge[], maxDisplay?: number }) {
  const displayBadges = badges.slice(0, maxDisplay)
  const remaining = badges.length - maxDisplay

  return (
    <div className="flex items-center space-x-1">
      {displayBadges.map((badge) => (
        <span
          key={badge.id}
          className="text-xl"
          title={badge.name}
        >
          {badge.icon}
        </span>
      ))}
      {remaining > 0 && (
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
          +{remaining}
        </span>
      )}
    </div>
  )
}
