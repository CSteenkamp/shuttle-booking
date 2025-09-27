'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

interface PaymentDetails {
  id: string
  merchantTxnId: string
  status: string
  amount: number
  credits: number
  package?: {
    name: string
    credits: number
    price: number
  }
  completedAt?: string
}

function PaymentSuccessContent() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Get payment ID from URL parameters
  const paymentId = searchParams.get('payment_id')

  useEffect(() => {
    if (status === 'loading') return // Wait for session to load

    if (status === 'unauthenticated') {
      router.push('/auth/signin')
      return
    }

    if (!paymentId) {
      setError('Payment ID not found')
      setLoading(false)
      return
    }

    fetchPaymentDetails()
  }, [status, paymentId])

  const fetchPaymentDetails = async () => {
    try {
      const response = await fetch(`/api/payments/status/${paymentId}`)
      
      if (response.ok) {
        const data = await response.json()
        setPaymentDetails(data)
        
        if (data.status === 'COMPLETED') {
          toast.success(`🎉 Payment successful! ${data.credits} credits added to your account.`, {
            duration: 5000,
            style: {
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              padding: '16px 20px',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: '600',
              boxShadow: '0 10px 25px rgba(16, 185, 129, 0.3)',
            },
            icon: '💳',
          })
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to fetch payment details')
      }
    } catch (error) {
      console.error('Error fetching payment details:', error)
      setError('Unable to fetch payment details')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Processing Payment...
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Please wait while we confirm your payment details.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 dark:from-red-900/20 dark:to-orange-900/20 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-500 text-2xl">❌</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Payment Error
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              {error}
            </p>
            <div className="space-y-3">
              <button
                onClick={() => router.push('/profile')}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Go to Profile
              </button>
              <button
                onClick={() => router.push('/profile')} // Redirect to credits page when created
                className="w-full bg-gray-500 text-white py-3 px-4 rounded-lg hover:bg-gray-600 transition-colors font-medium"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!paymentDetails) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Payment Not Found
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              The requested payment details could not be found.
            </p>
            <button
              onClick={() => router.push('/profile')}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Go to Profile
            </button>
          </div>
        </div>
      </div>
    )
  }

  const isCompleted = paymentDetails.status === 'COMPLETED'
  const isPending = paymentDetails.status === 'PENDING'
  const isFailed = paymentDetails.status === 'FAILED' || paymentDetails.status === 'CANCELLED'

  return (
    <div className={`min-h-screen flex items-center justify-center ${
      isCompleted 
        ? 'bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20'
        : isPending
          ? 'bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-yellow-900/20 dark:to-orange-900/20'
          : 'bg-gradient-to-br from-red-50 to-pink-100 dark:from-red-900/20 dark:to-pink-900/20'
    }`}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          {/* Status Icon */}
          <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isCompleted 
              ? 'bg-green-100 dark:bg-green-900/30'
              : isPending
                ? 'bg-yellow-100 dark:bg-yellow-900/30'
                : 'bg-red-100 dark:bg-red-900/30'
          }`}>
            <span className="text-2xl">
              {isCompleted ? '✅' : isPending ? '⏳' : '❌'}
            </span>
          </div>

          {/* Status Title */}
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {isCompleted 
              ? 'Payment Successful!'
              : isPending
                ? 'Payment Processing'
                : 'Payment Failed'
            }
          </h2>

          {/* Status Message */}
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            {isCompleted 
              ? `Your payment has been processed successfully and ${paymentDetails.credits} credits have been added to your account.`
              : isPending
                ? 'Your payment is being processed. Credits will be added to your account once confirmed.'
                : 'Your payment could not be processed. Please try again or contact support.'
            }
          </p>

          {/* Payment Details */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-center">
              Payment Details
            </h3>
            <div className="space-y-2 text-sm">
              {paymentDetails.package && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Package:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {paymentDetails.package.name}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Credits:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {paymentDetails.credits}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  R{paymentDetails.amount.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Transaction ID:</span>
                <span className="font-mono text-xs text-gray-900 dark:text-white break-all">
                  {paymentDetails.merchantTxnId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span className={`font-medium ${
                  isCompleted ? 'text-green-600' : isPending ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {paymentDetails.status}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => router.push('/book')}
              className={`w-full py-3 px-4 rounded-lg transition-colors font-medium ${
                isCompleted
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isCompleted ? 'Book Your Trip' : 'Continue'}
            </button>
            <button
              onClick={() => router.push('/profile')}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white py-3 px-4 rounded-lg transition-colors font-medium"
            >
              View Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-500 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Loading Payment Details...
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Please wait while we load your payment information.
            </p>
          </div>
        </div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  )
}