'use client'

import { useState } from 'react'

export default function EmailTestPage() {
  const [testResults, setTestResults] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testBookingConfirmation = async () => {
    setLoading(true)
    try {
      // You'll need to replace this with an actual booking ID from your database
      const response = await fetch('/api/email/booking-confirmation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: 'test-booking-id', // Replace with real booking ID
        }),
      })

      const result = await response.json()
      setTestResults(JSON.stringify(result, null, 2))
    } catch (error) {
      setTestResults(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testUpcomingBookings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/email/send-reminders')
      const result = await response.json()
      setTestResults(JSON.stringify(result, null, 2))
    } catch (error) {
      setTestResults(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const testReminderCron = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/email/send-reminders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET || 'development-secret-change-in-production'}`,
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()
      setTestResults(JSON.stringify(result, null, 2))
    } catch (error) {
      setTestResults(`Error: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          Email System Testing
        </h1>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Email Configuration Status
          </h2>
          <div className="space-y-2 text-sm">
            <p className="text-gray-600 dark:text-gray-300">
              <strong>EMAIL_USER:</strong> {process.env.EMAIL_USER ? '✅ Configured' : '❌ Not configured'}
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              <strong>EMAIL_PASS:</strong> {process.env.EMAIL_PASS ? '✅ Configured' : '❌ Not configured'}
            </p>
            <p className="text-gray-600 dark:text-gray-300">
              <strong>CRON_SECRET:</strong> {process.env.CRON_SECRET ? '✅ Configured' : '❌ Not configured'}
            </p>
          </div>
          
          {(!process.env.EMAIL_USER || !process.env.EMAIL_PASS) && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-yellow-800 dark:text-yellow-200 text-sm">
                <strong>Setup Required:</strong> Please configure EMAIL_USER and EMAIL_PASS in your .env file.
                For Gmail, enable 2FA and generate an App Password.
              </p>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Test Booking Confirmation
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
              Send a test booking confirmation email (requires valid booking ID)
            </p>
            <button
              onClick={testBookingConfirmation}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {loading ? 'Testing...' : 'Test Booking Email'}
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              View Upcoming Bookings
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
              Check upcoming bookings that would receive reminders
            </p>
            <button
              onClick={testUpcomingBookings}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {loading ? 'Loading...' : 'Check Upcoming Bookings'}
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Test Reminder System
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-4">
              Trigger the automated reminder system (sends actual emails)
            </p>
            <button
              onClick={testReminderCron}
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {loading ? 'Sending...' : 'Send Reminders Now'}
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Setup Instructions
            </h3>
            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
              <p><strong>1.</strong> Configure EMAIL_USER and EMAIL_PASS in .env</p>
              <p><strong>2.</strong> For Gmail: Enable 2FA → Generate App Password</p>
              <p><strong>3.</strong> Test with a real booking ID</p>
              <p><strong>4.</strong> Set up cron job for automated reminders</p>
            </div>
          </div>
        </div>

        {testResults && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Test Results
            </h3>
            <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg text-xs overflow-auto text-gray-800 dark:text-gray-200">
              {testResults}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}