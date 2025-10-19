/**
 * Trip Timeline Component
 * Visual timeline showing trip status progression
 */

import { format } from 'date-fns'

export interface TimelineEvent {
  status: string
  timestamp: Date | string
  label: string
  description?: string
  icon?: string
  location?: {
    lat: number
    lng: number
  }
}

interface TripTimelineProps {
  events: TimelineEvent[]
  currentStatus?: string
  compact?: boolean
}

export default function TripTimeline({ events, currentStatus, compact = false }: TripTimelineProps) {
  const sortedEvents = [...events].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  const getStatusColor = (status: string, isCurrent: boolean) => {
    if (!isCurrent) {
      return 'bg-green-500'
    }

    switch (status) {
      case 'ASSIGNED': return 'bg-yellow-500'
      case 'ACCEPTED': return 'bg-blue-500'
      case 'IN_PROGRESS': return 'bg-purple-500'
      case 'ARRIVED': return 'bg-indigo-500'
      case 'COMPLETED': return 'bg-green-500'
      case 'CANCELLED': return 'bg-red-500'
      case 'DECLINED': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ASSIGNED': return '📋'
      case 'ACCEPTED': return '✅'
      case 'IN_PROGRESS': return '🚗'
      case 'ARRIVED': return '📍'
      case 'COMPLETED': return '🎉'
      case 'CANCELLED': return '❌'
      case 'DECLINED': return '⛔'
      default: return '📌'
    }
  }

  return (
    <div className="relative">
      {sortedEvents.map((event, index) => {
        const isLast = index === sortedEvents.length - 1
        const isCurrent = event.status === currentStatus
        const statusColor = getStatusColor(event.status, isCurrent)
        const icon = event.icon || getStatusIcon(event.status)

        return (
          <div key={index} className="relative pb-8 last:pb-0">
            {/* Connecting Line */}
            {!isLast && (
              <span
                className="absolute left-5 top-10 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700"
                aria-hidden="true"
              />
            )}

            {/* Timeline Item */}
            <div className="relative flex items-start group">
              {/* Icon Circle */}
              <div className="relative flex items-center justify-center">
                <div
                  className={`h-10 w-10 rounded-full ${statusColor} flex items-center justify-center text-white font-bold shadow-lg ring-8 ring-white dark:ring-gray-900 ${
                    isCurrent ? 'animate-pulse' : ''
                  }`}
                >
                  <span className="text-lg">{icon}</span>
                </div>
              </div>

              {/* Content */}
              <div className={`ml-4 flex-1 ${compact ? 'min-w-0' : ''}`}>
                <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 ${
                  isCurrent ? 'ring-2 ring-indigo-500 dark:ring-indigo-400' : ''
                } transition-all hover:shadow-lg`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-base font-bold text-gray-900 dark:text-white">
                        {event.label}
                        {isCurrent && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300">
                            Current
                          </span>
                        )}
                      </h4>
                      {event.description && (
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                          {event.description}
                        </p>
                      )}
                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-500">
                        <span className="flex items-center">
                          🕐 {format(new Date(event.timestamp), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center">
                          {format(new Date(event.timestamp), 'h:mm a')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Compact version for smaller spaces
export function CompactTripTimeline({ events, currentStatus }: Omit<TripTimelineProps, 'compact'>) {
  const sortedEvents = [...events].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  const getStatusColor = (status: string, isCurrent: boolean) => {
    if (!isCurrent) {
      return 'bg-green-500'
    }

    switch (status) {
      case 'ASSIGNED': return 'bg-yellow-500'
      case 'ACCEPTED': return 'bg-blue-500'
      case 'IN_PROGRESS': return 'bg-purple-500'
      case 'ARRIVED': return 'bg-indigo-500'
      case 'COMPLETED': return 'bg-green-500'
      case 'CANCELLED': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ASSIGNED': return '📋'
      case 'ACCEPTED': return '✅'
      case 'IN_PROGRESS': return '🚗'
      case 'ARRIVED': return '📍'
      case 'COMPLETED': return '🎉'
      case 'CANCELLED': return '❌'
      default: return '📌'
    }
  }

  return (
    <div className="flex items-center space-x-2 overflow-x-auto pb-2">
      {sortedEvents.map((event, index) => {
        const isLast = index === sortedEvents.length - 1
        const isCurrent = event.status === currentStatus
        const statusColor = getStatusColor(event.status, isCurrent)
        const icon = event.icon || getStatusIcon(event.status)

        return (
          <div key={index} className="flex items-center flex-shrink-0">
            {/* Status Dot */}
            <div className="flex flex-col items-center">
              <div
                className={`h-8 w-8 rounded-full ${statusColor} flex items-center justify-center text-white text-sm shadow ${
                  isCurrent ? 'animate-pulse ring-2 ring-indigo-500 ring-offset-2' : ''
                }`}
                title={`${event.label} - ${format(new Date(event.timestamp), 'MMM d, h:mm a')}`}
              >
                {icon}
              </div>
              <span className="text-xs text-gray-600 dark:text-gray-400 mt-1 text-center max-w-[60px] truncate">
                {event.label.split(' ')[0]}
              </span>
            </div>

            {/* Connecting Line */}
            {!isLast && (
              <div className="h-0.5 w-8 bg-gray-300 dark:bg-gray-600" />
            )}
          </div>
        )
      })}
    </div>
  )
}

// Status badge component
export function TripStatusBadge({ status }: { status: string }) {
  const getStatusColor = () => {
    switch (status) {
      case 'ASSIGNED': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
      case 'ACCEPTED': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'IN_PROGRESS': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300'
      case 'ARRIVED': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300'
      case 'COMPLETED': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
      case 'CANCELLED': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
      case 'DECLINED': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getStatusLabel = () => {
    switch (status) {
      case 'ASSIGNED': return 'Assigned'
      case 'ACCEPTED': return 'Accepted'
      case 'IN_PROGRESS': return 'In Progress'
      case 'ARRIVED': return 'Arrived'
      case 'COMPLETED': return 'Completed'
      case 'CANCELLED': return 'Cancelled'
      case 'DECLINED': return 'Declined'
      default: return status
    }
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'ASSIGNED': return '📋'
      case 'ACCEPTED': return '✅'
      case 'IN_PROGRESS': return '🚗'
      case 'ARRIVED': return '📍'
      case 'COMPLETED': return '🎉'
      case 'CANCELLED': return '❌'
      case 'DECLINED': return '⛔'
      default: return '📌'
    }
  }

  return (
    <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor()}`}>
      <span>{getStatusIcon()}</span>
      <span>{getStatusLabel()}</span>
    </span>
  )
}
