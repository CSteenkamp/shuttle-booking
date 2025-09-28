'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import toast from 'react-hot-toast'

export default function VerificationReminder() {
  const { data: session } = useSession()
  const [isResending, setIsResending] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const t = useTranslations('auth')

  // Don't show if user is verified, not logged in, or dismissed
  if (!session || session.user.emailVerified || isDismissed) {
    return null
  }

  // Calculate hours since account creation
  const createdAt = new Date(session.user.createdAt)
  const now = new Date()
  const hoursOld = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)
  const hoursRemaining = Math.max(0, 24 - hoursOld)

  // Don't show if account is older than 24 hours (grace period expired)
  if (hoursRemaining <= 0) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-600 rounded-lg p-4 m-4">
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 text-red-500 mt-0.5">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Email Verification Required
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
              Your 24-hour grace period has expired. Please verify your email to continue using your account.
            </p>
            <button
              onClick={handleResendVerification}
              disabled={isResending}
              className="mt-2 text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
            >
              {isResending ? 'Sending...' : 'Resend Verification Email'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleResendVerification = async () => {
    setIsResending(true)
    
    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: session.user.email }),
      })

      if (response.ok) {
        toast.success('Verification email sent! Check your inbox.')
      } else {
        toast.error('Failed to send verification email. Please try again.')
      }
    } catch (error) {
      console.error('Error resending verification:', error)
      toast.error('Failed to send verification email. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  const handleDismiss = () => {
    setIsDismissed(true)
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-600 rounded-lg p-4 m-4">
      <div className="flex items-start space-x-3">
        <div className="w-5 h-5 text-yellow-500 mt-0.5">
          <svg fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
            Please Verify Your Email
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
            You have <strong>{Math.ceil(hoursRemaining)} hours</strong> to verify your email address. 
            Check your inbox for a verification link, or click below to resend.
          </p>
          <div className="mt-3 flex items-center space-x-3">
            <button
              onClick={handleResendVerification}
              disabled={isResending}
              className="text-sm bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded transition-colors disabled:opacity-50"
            >
              {isResending ? 'Sending...' : 'Resend Verification Email'}
            </button>
            <button
              onClick={handleDismiss}
              className="text-sm text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100 transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-yellow-500 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  )
}