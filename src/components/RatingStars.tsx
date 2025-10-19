/**
 * Rating Stars Component
 * Display and interactive star rating
 */

'use client'

import { useState } from 'react'

interface RatingStarsProps {
  value: number
  onChange?: (value: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
  showCount?: boolean
  count?: number
}

export default function RatingStars({
  value,
  onChange,
  readonly = false,
  size = 'md',
  showCount = false,
  count
}: RatingStarsProps) {
  const [hoverValue, setHoverValue] = useState(0)

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  const displayValue = hoverValue || value

  return (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange && onChange(star)}
          onMouseEnter={() => !readonly && setHoverValue(star)}
          onMouseLeave={() => !readonly && setHoverValue(0)}
          disabled={readonly}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform ${
            sizeClasses[size]
          }`}
          aria-label={`${star} star${star !== 1 ? 's' : ''}`}
        >
          <svg
            className={`w-full h-full ${
              star <= displayValue
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300 dark:text-gray-600'
            }`}
            fill={star <= displayValue ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.5"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
            />
          </svg>
        </button>
      ))}
      {showCount && count !== undefined && (
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
          ({count})
        </span>
      )}
    </div>
  )
}

// Display-only version with average rating
export function RatingDisplay({
  rating,
  count,
  size = 'md'
}: {
  rating: number
  count?: number
  size?: 'sm' | 'md' | 'lg'
}) {
  return (
    <div className="flex items-center space-x-2">
      <RatingStars value={rating} readonly size={size} />
      <span className="text-sm font-semibold text-gray-900 dark:text-white">
        {rating.toFixed(1)}
      </span>
      {count !== undefined && (
        <span className="text-sm text-gray-500 dark:text-gray-400">
          ({count} rating{count !== 1 ? 's' : ''})
        </span>
      )}
    </div>
  )
}

// Star distribution bar chart
export function StarDistribution({
  distribution
}: {
  distribution: {
    5: number
    4: number
    3: number
    2: number
    1: number
  }
}) {
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0)

  return (
    <div className="space-y-2">
      {[5, 4, 3, 2, 1].map((stars) => {
        const count = distribution[stars as keyof typeof distribution]
        const percentage = total > 0 ? (count / total) * 100 : 0

        return (
          <div key={stars} className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 w-12">
              {stars} star{stars !== 1 ? 's' : ''}
            </span>
            <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 transition-all duration-300"
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
