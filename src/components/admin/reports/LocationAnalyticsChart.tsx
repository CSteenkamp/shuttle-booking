'use client'

import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  Legend
} from 'recharts'

interface LocationAnalyticsChartProps {
  data: Array<{
    name: string
    category: string
    totalTrips: number
    totalBookings: number
    popularity: number
  }>
}

const COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
]

export default function LocationAnalyticsChart({ data }: LocationAnalyticsChartProps) {
  const CustomTooltip = ({ active, payload }: {
    active?: boolean
    payload?: Array<{ payload: Record<string, any> }>
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white">{data.name}</p>
          <p className="text-blue-600 dark:text-blue-400">
            Category: {data.category}
          </p>
          <p className="text-green-600 dark:text-green-400">
            Total Trips: {data.totalTrips}
          </p>
          <p className="text-purple-600 dark:text-purple-400">
            Total Bookings: {data.totalBookings}
          </p>
          <p className="text-amber-600 dark:text-amber-400">
            Popularity Score: {data.popularity}
          </p>
        </div>
      )
    }
    return null
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">📍</div>
          <div>No location data available</div>
        </div>
      </div>
    )
  }

  const chartData = data.slice(0, 8).map((location, index) => ({
    ...location,
    value: location.popularity,
    fill: COLORS[index % COLORS.length]
  }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="bottom" 
            height={36}
            formatter={(value, entry) => (
              <span className="text-xs text-gray-600 dark:text-gray-400">
                {entry.payload.name}
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Top Locations List */}
      <div className="mt-4 space-y-2">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Top Destinations by Popularity
        </h4>
        <div className="space-y-1">
          {data.slice(0, 5).map((location, index) => (
            <div key={location.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
                <span className="text-gray-700 dark:text-gray-300">{location.name}</span>
                <span className="text-gray-500 dark:text-gray-500">({location.category})</span>
              </div>
              <span className="text-gray-600 dark:text-gray-400 font-medium">
                {location.popularity} activities
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}