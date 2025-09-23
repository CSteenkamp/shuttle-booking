'use client'

interface FinancialSummaryProps {
  data: {
    totalRevenue: number
    totalCreditsIssued: number
    totalCreditsUsed: number
    creditValue: number
    averageRevenuePerDay: number
    creditFlow: {
      purchased: number
      used: number
      balance: number
    }
  }
}

export default function FinancialSummary({ data }: FinancialSummaryProps) {
  const formatCurrency = (value: number) => `R${value.toLocaleString()}`
  const formatNumber = (value: number) => value.toLocaleString()

  const utilizationRate = data.totalCreditsIssued > 0 
    ? Math.round((data.totalCreditsUsed / data.totalCreditsIssued) * 100) 
    : 0

  const metrics = [
    {
      title: 'Total Revenue',
      value: formatCurrency(data.totalRevenue),
      icon: '💰',
      color: 'green',
      description: 'Total revenue from credit purchases'
    },
    {
      title: 'Credits Issued',
      value: formatNumber(data.totalCreditsIssued),
      icon: '🎫',
      color: 'blue',
      description: 'Total credits issued to users'
    },
    {
      title: 'Credits Used',
      value: formatNumber(data.totalCreditsUsed),
      icon: '🚐',
      color: 'purple',
      description: 'Credits consumed for trips'
    },
    {
      title: 'Credit Utilization',
      value: `${utilizationRate}%`,
      icon: '📊',
      color: utilizationRate > 70 ? 'green' : utilizationRate > 40 ? 'amber' : 'red',
      description: 'Percentage of issued credits used'
    },
    {
      title: 'Avg Revenue/Day',
      value: formatCurrency(data.averageRevenuePerDay),
      icon: '📈',
      color: 'indigo',
      description: 'Average daily revenue'
    },
    {
      title: 'Credit Value',
      value: formatCurrency(data.creditValue),
      icon: '💳',
      color: 'gray',
      description: 'Value per credit'
    }
  ]

  const getColorClasses = (color: string) => {
    const colors = {
      green: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-600 text-green-700 dark:text-green-300',
      blue: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-600 text-blue-700 dark:text-blue-300',
      purple: 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-600 text-purple-700 dark:text-purple-300',
      amber: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-600 text-amber-700 dark:text-amber-300',
      red: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-600 text-red-700 dark:text-red-300',
      indigo: 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300',
      gray: 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
    }
    return colors[color as keyof typeof colors] || colors.gray
  }

  return (
    <div className="space-y-6">
      {/* Financial Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric, index) => (
          <div key={index} className={`p-4 rounded-lg border ${getColorClasses(metric.color)}`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{metric.icon}</span>
              <div className="text-right">
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="text-sm opacity-75">{metric.title}</div>
              </div>
            </div>
            <p className="text-xs opacity-75">{metric.description}</p>
          </div>
        ))}
      </div>

      {/* Credit Flow Analysis */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Credit Flow Analysis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Credits Purchased */}
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">💵</span>
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(data.creditFlow.purchased)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Credits Purchased</div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {formatNumber(data.creditFlow.purchased / data.creditValue)} credits
            </div>
          </div>

          {/* Credits Used */}
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🎯</span>
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatNumber(data.creditFlow.used)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Credits Used</div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {formatCurrency(data.creditFlow.used * data.creditValue)} value
            </div>
          </div>

          {/* Credits Balance */}
          <div className="text-center">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">💰</span>
            </div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {formatNumber(data.creditFlow.balance)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Credits Available</div>
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              {formatCurrency(data.creditFlow.balance * data.creditValue)} value
            </div>
          </div>
        </div>

        {/* Flow Visualization */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Purchased: {formatNumber(data.creditFlow.purchased / data.creditValue)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>→</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span>Used: {formatNumber(data.creditFlow.used)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span>→</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
              <span>Balance: {formatNumber(data.creditFlow.balance)}</span>
            </div>
          </div>
          
          {/* Utilization Bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
              <span>Credit Utilization</span>
              <span>{utilizationRate}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  utilizationRate > 70 ? 'bg-green-500' : 
                  utilizationRate > 40 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(utilizationRate, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}