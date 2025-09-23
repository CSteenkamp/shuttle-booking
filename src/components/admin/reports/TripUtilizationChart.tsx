'use client'

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts'

interface TripUtilizationChartProps {
  data: Array<{
    destination: string
    maxPassengers: number
    bookings: number
    utilization: number
    revenue: number
    date: string
  }>
  showDetailedView?: boolean
}

export default function TripUtilizationChart({ data, showDetailedView = false }: TripUtilizationChartProps) {
  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 80) return '#10b981' // Green - High utilization
    if (utilization >= 60) return '#f59e0b' // Amber - Medium utilization
    if (utilization >= 40) return '#ef4444' // Red - Low utilization
    return '#6b7280' // Gray - Very low utilization
  }

  const CustomTooltip = ({ active, payload }: {
    active?: boolean
    payload?: Array<{ value: number; payload: Record<string, any> }>
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white">{data.destination}</p>
          <p className="text-blue-600 dark:text-blue-400">
            Utilization: {data.utilization}%
          </p>
          <p className="text-gray-600 dark:text-gray-400">
            {data.bookings} / {data.maxPassengers} passengers
          </p>
          {showDetailedView && (
            <>
              <p className="text-green-600 dark:text-green-400">
                Revenue: R{data.revenue.toLocaleString()}
              </p>
              <p className="text-purple-600 dark:text-purple-400">
                Date: {data.date}
              </p>
            </>
          )}
        </div>
      )
    }
    return null
  }

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">🚐</div>
          <div>No trip utilization data available</div>
        </div>
      </div>
    )
  }

  // Sort data by utilization for better visualization
  const sortedData = [...data].sort((a, b) => b.utilization - a.utilization).slice(0, 10)

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={sortedData} 
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          layout="horizontal"
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            type="number"
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
            className="text-xs"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            type="category"
            dataKey="destination"
            className="text-xs"
            tick={{ fontSize: 10 }}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="utilization"
            radius={[0, 4, 4, 0]}
          >
            {sortedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getUtilizationColor(entry.utilization)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      
      {/* Legend */}
      <div className="flex items-center justify-center space-x-4 mt-4 text-xs">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">80%+ Excellent</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-amber-500 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">60-79% Good</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">40-59% Low</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-gray-500 rounded"></div>
          <span className="text-gray-600 dark:text-gray-400">&lt;40% Poor</span>
        </div>
      </div>
    </div>
  )
}