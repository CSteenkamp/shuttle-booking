'use client'

import { useEffect, useState } from 'react'

interface WheelDatePickerProps {
  value: { day: number; month: number; year: number } | null
  onChange: (date: { day: number; month: number; year: number } | null) => void
  minYear?: number
  maxYear?: number
}

export default function WheelDatePicker({ 
  value, 
  onChange, 
  minYear = 1950, 
  maxYear = new Date().getFullYear() 
}: WheelDatePickerProps) {
  const [day, setDay] = useState(value?.day || 15)
  const [month, setMonth] = useState(value?.month || 6)
  const [year, setYear] = useState(value?.year || 2010)
  const [isConfirmed, setIsConfirmed] = useState(!!value)

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month, 0).getDate()
  }

  const days = Array.from({ length: getDaysInMonth(month, year) }, (_, i) => i + 1)
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i)

  // Only update parent when there's an existing value and user changes it while editing
  useEffect(() => {
    if (value && !isConfirmed) {
      onChange({ day, month, year })
    }
  }, [day, month, year, onChange, value, isConfirmed])

  // Adjust day if it's invalid for the selected month/year
  useEffect(() => {
    const maxDay = getDaysInMonth(month, year)
    if (day > maxDay) {
      setDay(maxDay)
    }
  }, [month, year, day])

  const WheelColumn = ({ 
    items, 
    selectedValue, 
    onSelect,
    type
  }: { 
    items: (string | number)[]
    selectedValue: number
    onSelect: (value: number) => void
    type: 'day' | 'month' | 'year'
  }) => (
    <div className="flex flex-col">
      <div className="h-24 overflow-y-auto border rounded-lg bg-gray-50 dark:bg-gray-700 relative">
        <style jsx>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .hide-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
        
        <div className="py-2 hide-scrollbar">
          {items.map((item, index) => {
            const value = type === 'month' ? index + 1 : typeof item === 'number' ? item : index + 1
            const isSelected = value === selectedValue
            
            return (
              <div
                key={index}
                onClick={() => onSelect(value)}
                className={`h-6 flex items-center justify-center text-sm cursor-pointer transition-all duration-150 hover:bg-purple-100 dark:hover:bg-purple-800 ${
                  isSelected 
                    ? 'bg-purple-200 dark:bg-purple-700 text-purple-900 dark:text-purple-100 font-semibold' 
                    : 'text-gray-700 dark:text-gray-300 hover:text-purple-700 dark:hover:text-purple-300'
                }`}
              >
                {item}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )

  const handleConfirm = () => {
    setIsConfirmed(true)
    onChange({ day, month, year })
  }

  const handleEdit = () => {
    setIsConfirmed(false)
  }

  if (isConfirmed) {
    // Confirmed state - show only the selected date with edit option
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-3">
        <div className="text-center">
          <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-600 rounded-lg p-4">
            <p className="text-sm font-medium text-purple-900 dark:text-purple-200 mb-2">Date of Birth</p>
            <p className="text-xl font-bold text-purple-800 dark:text-purple-100 mb-3">
              {months[month - 1]} {day}, {year}
            </p>
            <button
              type="button"
              onClick={handleEdit}
              className="bg-gradient-to-r from-gray-500 to-gray-600 text-white px-4 py-2 rounded-lg hover:from-gray-600 hover:to-gray-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg"
            >
              Edit Date
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Editing state - show the wheel selectors
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 text-center">
            Day
          </label>
          <WheelColumn
            items={days}
            selectedValue={day}
            onSelect={setDay}
            type="day"
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 text-center">
            Month
          </label>
          <WheelColumn
            items={months}
            selectedValue={month}
            onSelect={setMonth}
            type="month"
          />
        </div>
        
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 text-center">
            Year
          </label>
          <WheelColumn
            items={years}
            selectedValue={year}
            onSelect={setYear}
            type="year"
          />
        </div>
      </div>
      
      <div className="mt-3 text-center">
        <div className="bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-600 rounded-lg p-3 mb-2">
          <p className="text-sm font-medium text-purple-900 dark:text-purple-200 mb-1">Selected Date</p>
          <p className="text-lg font-bold text-purple-800 dark:text-purple-100">
            {months[month - 1]} {day}, {year}
          </p>
        </div>
        <button
          type="button"
          onClick={handleConfirm}
          className="mt-1 bg-gradient-to-r from-purple-500 to-pink-600 text-white px-4 py-2 rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all duration-200 text-sm font-medium shadow-md hover:shadow-lg"
        >
          Confirm Date
        </button>
      </div>
    </div>
  )
}