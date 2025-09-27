'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface VerificationResult {
  success: boolean
  message: string
  user?: {
    id: string
    email: string
    name: string
    emailVerified: boolean
  }
}

function VerifyEmailContent() {
  const [result, setResult] = useState<VerificationResult | null>(null)
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setResult({
          success: false,
          message: 'No verification token provided'
        })
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`)
        const data = await response.json()

        if (response.ok) {
          setResult({
            success: true,
            message: data.message,
            user: data.user
          })
          
          // Redirect to login page after 3 seconds
          setTimeout(() => {
            router.push('/auth/signin?message=Email verified successfully! Please sign in.')
          }, 3000)
        } else {
          setResult({
            success: false,
            message: data.error || 'Verification failed'
          })
        }
      } catch (error) {
        setResult({
          success: false,
          message: 'Network error occurred'
        })
      } finally {
        setLoading(false)
      }
    }

    verifyEmail()
  }, [token, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying Email</h1>
          <p className="text-gray-600">Please wait while we verify your email address...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
        {result?.success ? (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h1>
            <p className="text-gray-600 mb-6">{result.message}</p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-green-700 text-sm">
                Welcome to Tjoef-Tjaf! Your account is now activated and you can start booking shuttle trips.
              </p>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Redirecting to sign in page in 3 seconds...</p>
              <Link 
                href="/auth/signin"
                className="inline-block w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
              >
                Sign In Now
              </Link>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h1>
            <p className="text-gray-600 mb-6">{result?.message}</p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-700 text-sm">
                {result?.message?.includes('expired') 
                  ? 'Your verification link has expired. Please request a new verification email.'
                  : 'The verification link is invalid or has already been used.'
                }
              </p>
            </div>
            <div className="space-y-3">
              <Link 
                href="/auth/signup"
                className="inline-block w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
              >
                Request New Verification
              </Link>
              <Link 
                href="/auth/signin"
                className="inline-block w-full border border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Loading</h1>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  )
}