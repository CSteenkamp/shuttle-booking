'use client'

interface OperationalMetricsProps {
  data: {
    totalTrips: number
    completedTrips: number
    cancelledTrips: number
    totalBookings: number
    confirmedBookings: number
    averageUtilization: number
    peakDestinations: Array<{
      name: string
      category: string
      totalTrips: number
      totalBookings: number
      popularity: number
    }>
    newUsers: number
  }
}

export default function OperationalMetrics({ data }: OperationalMetricsProps) {
  const formatNumber = (value: number) => value.toLocaleString()
  const formatPercentage = (value: number) => `${value}%`

  const tripCompletionRate = data.totalTrips > 0 
    ? Math.round((data.completedTrips / data.totalTrips) * 100) 
    : 0

  const bookingConfirmationRate = data.totalBookings > 0 
    ? Math.round((data.confirmedBookings / data.totalBookings) * 100) 
    : 0

  const metrics = [
    {
      title: 'Total Trips',
      value: formatNumber(data.totalTrips),
      icon: '🚐',
      color: 'blue',
      subtitle: 'All scheduled trips'
    },
    {
      title: 'Completed Trips',
      value: formatNumber(data.completedTrips),
      icon: '✅',
      color: 'green',
      subtitle: `${tripCompletionRate}% completion rate`
    },
    {
      title: 'Cancelled Trips',
      value: formatNumber(data.cancelledTrips),
      icon: '❌',
      color: 'red',
      subtitle: `${data.totalTrips > 0 ? Math.round((data.cancelledTrips / data.totalTrips) * 100) : 0}% cancellation rate`
    },
    {
      title: 'Total Bookings',
      value: formatNumber(data.totalBookings),
      icon: '📋',
      color: 'purple',
      subtitle: 'All booking requests'
    },
    {
      title: 'Confirmed Bookings',
      value: formatNumber(data.confirmedBookings),
      icon: '✔️',
      color: 'green',
      subtitle: `${bookingConfirmationRate}% confirmation rate`
    },
    {
      title: 'Avg Utilization',
      value: formatPercentage(data.averageUtilization),
      icon: '📊',
      color: data.averageUtilization > 70 ? 'green' : data.averageUtilization > 40 ? 'amber' : 'red',
      subtitle: 'Trip capacity usage'
    }
  ]

  const getColorClasses = (color: string, isCard = false) => {
    if (isCard) {
      const colors = {
        green: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-600',
        blue: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-600',
        purple: 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-600',
        amber: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-600',
        red: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-600',
        gray: 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-600'
      }
      return colors[color as keyof typeof colors] || colors.gray
    } else {
      const colors = {
        green: 'text-green-600 dark:text-green-400',
        blue: 'text-blue-600 dark:text-blue-400',
        purple: 'text-purple-600 dark:text-purple-400',
        amber: 'text-amber-600 dark:text-amber-400',
        red: 'text-red-600 dark:text-red-400',
        gray: 'text-gray-600 dark:text-gray-400'
      }
      return colors[color as keyof typeof colors] || colors.gray
    }
  }

  return (
    <div className="space-y-6">
      {/* Operational Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <div key={index} className={`p-4 rounded-lg border ${getColorClasses(metric.color, true)}`}>
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{metric.icon}</span>
              <div className="flex-1">
                <div className={`text-2xl font-bold ${getColorClasses(metric.color)}`}>
                  {metric.value}
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                  {metric.title}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  {metric.subtitle}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trip Performance */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Trip Performance
          </h3>
          <div className="space-y-4">
            {/* Completion Rate */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">Completion Rate</span>
                <span className="font-medium text-gray-900 dark:text-white">{tripCompletionRate}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${tripCompletionRate}%` }}
                ></div>
              </div>
            </div>

            {/* Utilization Rate */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">Average Utilization</span>
                <span className="font-medium text-gray-900 dark:text-white">{data.averageUtilization}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    data.averageUtilization > 70 ? 'bg-green-500' : 
                    data.averageUtilization > 40 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.min(data.averageUtilization, 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Trip Status Breakdown */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {data.completedTrips}
                </div>
                <div className="text-xs text-green-700 dark:text-green-300">Completed</div>
              </div>
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {data.totalTrips - data.completedTrips - data.cancelledTrips}
                </div>
                <div className="text-xs text-blue-700 dark:text-blue-300">Active</div>
              </div>
              <div className="text-center p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {data.cancelledTrips}
                </div>
                <div className="text-xs text-red-700 dark:text-red-300">Cancelled</div>
              </div>
            </div>
          </div>
        </div>

        {/* Popular Destinations */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Destinations
          </h3>
          {data.peakDestinations.length > 0 ? (
            <div className="space-y-3">
              {data.peakDestinations.slice(0, 5).map((destination, index) => (
                <div key={destination.name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                      index === 0 ? 'bg-yellow-500' :
                      index === 1 ? 'bg-gray-400' :
                      index === 2 ? 'bg-amber-600' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        {destination.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {destination.category}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-900 dark:text-white">
                      {destination.popularity}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      activities
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <div className="text-4xl mb-2">📍</div>
              <div>No destination data available</div>
            </div>
          )}
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Key Performance Indicators
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {tripCompletionRate}%
            </div>
            <div className="text-sm text-blue-700 dark:text-blue-300">Trip Success Rate</div>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-lg">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {bookingConfirmationRate}%
            </div>
            <div className="text-sm text-green-700 dark:text-green-300">Booking Success</div>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {data.totalTrips > 0 ? Math.round(data.totalBookings / data.totalTrips * 10) / 10 : 0}
            </div>
            <div className="text-sm text-purple-700 dark:text-purple-300">Bookings per Trip</div>
          </div>
          
          <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/30 dark:to-amber-800/30 rounded-lg">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {data.newUsers}
            </div>
            <div className="text-sm text-amber-700 dark:text-amber-300">New Users</div>
          </div>
        </div>
      </div>
    </div>
  )
}