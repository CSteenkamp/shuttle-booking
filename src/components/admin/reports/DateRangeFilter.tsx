'use client'

import { useState } from 'react'
import { format } from 'date-fns'

interface DateRange {
  start: Date
  end: Date
  label: string
}

interface DateRangeFilterProps {
  selectedRange: DateRange
  presetRanges: DateRange[]
  onRangeChange: (range: DateRange) => void
  onCustomRange: (start: Date, end: Date) => void
}

export default function DateRangeFilter({ 
  selectedRange, 
  presetRanges, 
  onRangeChange, 
  onCustomRange 
}: DateRangeFilterProps) {
  const [showCustom, setShowCustom] = useState(false)
  const [customStart, setCustomStart] = useState(format(selectedRange.start, 'yyyy-MM-dd'))
  const [customEnd, setCustomEnd] = useState(format(selectedRange.end, 'yyyy-MM-dd'))

  const handleCustomSubmit = () => {
    const start = new Date(customStart)
    const end = new Date(customEnd)
    
    if (start <= end) {
      onCustomRange(start, end)
      setShowCustom(false)
    }
  }

  return (
    <div className="relative">
      <div className="flex items-center space-x-2">
        {/* Preset Range Selector */}
        <select 
          value={selectedRange.label}
          onChange={(e) => {
            const range = presetRanges.find(r => r.label === e.target.value)
            if (range) {
              onRangeChange(range)
            }
          }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
        >
          {presetRanges.map(range => (
            <option key={range.label} value={range.label}>
              {range.label}
            </option>
          ))}
        </select>

        {/* Custom Range Button */}
        <button
          onClick={() => setShowCustom(!showCustom)}
          className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
        >
          📅 Custom
        </button>
      </div>

      {/* Custom Date Range Panel */}
      {showCustom && (
        <div className="absolute top-full left-0 mt-2 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 min-w-64">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Custom Date Range
          </h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex space-x-2 pt-2">
              <button
                onClick={handleCustomSubmit}
                className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-sm font-medium"
              >
                Apply
              </button>
              <button
                onClick={() => setShowCustom(false)}
                className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selected Range Display */}
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        {format(selectedRange.start, 'MMM d, yyyy')} - {format(selectedRange.end, 'MMM d, yyyy')}
      </div>
    </div>
  )
}