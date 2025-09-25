'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

export default function PaymentCancelPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return // Wait for session to load

    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    // Show cancellation message
    toast.error('Payment was cancelled. No charges were made to your account.', {
      duration: 5000,
      style: {
        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
        color: 'white',
        padding: '16px 20px',
        borderRadius: '12px',
        fontSize: '16px',
        fontWeight: '600',
        boxShadow: '0 10px 25px rgba(245, 158, 11, 0.3)',
      },
      icon: '⚠️',
    })
  }, [status])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-100 dark:from-orange-900/20 dark:to-yellow-900/20 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Loading...
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Please wait while we redirect you.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-yellow-100 dark:from-orange-900/20 dark:to-yellow-900/20 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Cancel Icon */}
          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-orange-500 text-2xl">⚠️</span>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Payment Cancelled
          </h2>

          {/* Message */}
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            Your payment has been cancelled and no charges were made to your account. 
            You can try again or choose a different payment method.
          </p>

          {/* Information Box */}
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-600 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <div className="w-5 h-5 text-orange-500 mt-0.5">
                <svg fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-orange-800 dark:text-orange-200 font-medium mb-1">
                  What happens next?
                </p>
                <ul className="text-xs text-orange-700 dark:text-orange-300 space-y-1">
                  <li>• No payment was processed</li>
                  <li>• Your credit balance remains unchanged</li>
                  <li>• You can try purchasing credits again anytime</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/profile')} // Will redirect to credits page when implemented
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 px-4 rounded-lg transition-colors font-medium"
            >
              Try Again
            </button>
            <button
              onClick={() => router.push('/book')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors font-medium"
            >
              Continue Booking
            </button>
            <button
              onClick={() => router.push('/profile')}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors font-medium"
            >
              View Profile
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Having trouble with payments? Contact support for assistance with your credit purchase.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}