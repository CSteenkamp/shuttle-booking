'use client'

import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export default function DriverApplicationSuccess() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-indigo-900 transition-colors duration-300">
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="max-w-2xl w-full">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-8 md:p-12">
            {/* Success Icon */}
            <div className="flex justify-center mb-8">
              <div className="w-24 h-24 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full flex items-center justify-center shadow-lg animate-bounce">
                <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>

            {/* Success Message */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Application Submitted!
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Thank you for applying to become a driver with Tjoef-Tjaf
              </p>
            </div>

            {/* What's Next */}
            <div className="space-y-6 mb-8">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-2 border-blue-200 dark:border-blue-700 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-blue-900 dark:text-blue-200 mb-4 flex items-center">
                  <span className="text-2xl mr-3">📋</span>
                  What Happens Next?
                </h2>
                <ul className="space-y-4">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-200 dark:bg-blue-800 rounded-lg flex items-center justify-center text-blue-900 dark:text-blue-200 font-bold mr-3 mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Application Review</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Our admin team will review your application within 1-3 business days
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-200 dark:bg-blue-800 rounded-lg flex items-center justify-center text-blue-900 dark:text-blue-200 font-bold mr-3 mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Email Notification</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        You'll receive an email with approval status and next steps
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-200 dark:bg-blue-800 rounded-lg flex items-center justify-center text-blue-900 dark:text-blue-200 font-bold mr-3 mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Document Upload</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Once approved, upload required documents (license, ID, vehicle registration, insurance)
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-200 dark:bg-blue-800 rounded-lg flex items-center justify-center text-blue-900 dark:text-blue-200 font-bold mr-3 mt-0.5">
                      4
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-white">Start Driving</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Complete orientation, sync your calendar, and start receiving trip assignments!
                      </p>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Quick Tips */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-2 border-purple-200 dark:border-purple-700 rounded-2xl p-6">
                <h2 className="text-xl font-bold text-purple-900 dark:text-purple-200 mb-4 flex items-center">
                  <span className="text-2xl mr-3">💡</span>
                  In the Meantime
                </h2>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start">
                    <span className="text-purple-600 dark:text-purple-400 mr-2">•</span>
                    <p className="text-gray-700 dark:text-gray-300">
                      Gather your documents (driver's license, vehicle registration, proof of insurance)
                    </p>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-600 dark:text-purple-400 mr-2">•</span>
                    <p className="text-gray-700 dark:text-gray-300">
                      Ensure your vehicle is clean and well-maintained
                    </p>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-600 dark:text-purple-400 mr-2">•</span>
                    <p className="text-gray-700 dark:text-gray-300">
                      Set up your Google Calendar if you haven't already (for availability sync)
                    </p>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-600 dark:text-purple-400 mr-2">•</span>
                    <p className="text-gray-700 dark:text-gray-300">
                      Review our driver guidelines and service standards
                    </p>
                  </li>
                </ul>
              </div>

              {/* Contact Info */}
              <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-2xl p-6">
                <p className="text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Questions?</span> Contact our driver support team at{' '}
                  <a href="mailto:drivers@tjoeftjaf.co.za" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                    drivers@tjoeftjaf.co.za
                  </a>
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/"
                className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-center shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Go to Home
              </Link>
              <Link
                href="/auth/signin"
                className="flex-1 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-4 px-6 rounded-xl font-semibold text-center hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
