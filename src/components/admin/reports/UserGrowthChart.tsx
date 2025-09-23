'use client'

import { 
  ComposedChart, 
  Bar, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts'

interface UserGrowthChartProps {
  data: Array<{
    date: string
    newUsers: number
    totalUsers: number
    activeUsers: number
  }>
}

export default function UserGrowthChart({ data }: UserGrowthChartProps) {
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean
    payload?: Array<{ value: number; dataKey: string; payload: Record<string, any> }>
    label?: string
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="font-semibold text-gray-900 dark:text-white">{label}</p>
          <p className="text-blue-600 dark:text-blue-400">
            New Users: {payload.find((p: any) => p.dataKey === 'newUsers')?.value || 0}
          </p>
          <p className="text-purple-600 dark:text-purple-400">
            Total Users: {payload.find((p: any) => p.dataKey === 'totalUsers')?.value || 0}
          </p>
          <p className="text-green-600 dark:text-green-400">
            Active Users: {payload.find((p: any) => p.dataKey === 'activeUsers')?.value || 0}
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
          <div className="text-4xl mb-2">👥</div>
          <div>No user growth data available</div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="date" 
            className="text-xs"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            className="text-xs"
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            dataKey="newUsers"
            fill="#3b82f6"
            name="New Users"
            radius={[2, 2, 0, 0]}
          />
          <Line
            type="monotone"
            dataKey="totalUsers"
            stroke="#8b5cf6"
            strokeWidth={2}
            name="Total Users"
            dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="activeUsers"
            stroke="#10b981"
            strokeWidth={2}
            name="Active Users"
            dot={{ fill: '#10b981', strokeWidth: 2, r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}