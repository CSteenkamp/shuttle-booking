/**
 * Address Input Component with Verification
 * Validates addresses using geocoding API
 */

'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface VerifiedAddress {
  formattedAddress: string
  latitude: number
  longitude: number
  components: {
    streetNumber?: string
    street?: string
    suburb?: string
    city?: string
    province?: string
    postalCode?: string
    country?: string
  }
  confidence: 'high' | 'medium' | 'low'
}

interface AddressInputProps {
  value: string
  onChange: (value: string) => void
  onVerified?: (address: VerifiedAddress) => void
  label?: string
  placeholder?: string
  required?: boolean
  error?: string
  showVerification?: boolean
  autoVerify?: boolean
}

export default function AddressInput({
  value,
  onChange,
  onVerified,
  label = 'Address',
  placeholder = 'Enter your address...',
  required = false,
  error,
  showVerification = true,
  autoVerify = false
}: AddressInputProps) {
  const [verifying, setVerifying] = useState(false)
  const [verified, setVerified] = useState(false)
  const [verifiedAddress, setVerifiedAddress] = useState<VerifiedAddress | null>(null)
  const [suggestions, setSuggestions] = useState<VerifiedAddress[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [touched, setTouched] = useState(false)

  // Auto-verify on input change (debounced)
  useEffect(() => {
    if (!autoVerify || !value || value.length < 10) {
      return
    }

    const timer = setTimeout(() => {
      handleVerify()
    }, 1000) // 1 second debounce

    return () => clearTimeout(timer)
  }, [value, autoVerify])

  const handleVerify = async () => {
    if (!value || value.trim().length < 5) {
      toast.error('Please enter a complete address')
      return
    }

    setVerifying(true)
    setVerified(false)
    setSuggestions([])

    try {
      const response = await fetch('/api/geocoding/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ address: value })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setVerified(true)
        setVerifiedAddress(data.address)
        setSuggestions(data.suggestions || [])

        // If exact match, auto-accept
        if (data.address.confidence === 'high') {
          onChange(data.address.formattedAddress)
          onVerified?.(data.address)
          toast.success('✓ Address verified', {
            duration: 2000,
            style: {
              background: 'linear-gradient(135deg, #059669, #047857)',
              color: 'white',
              padding: '12px 16px',
              borderRadius: '8px'
            }
          })
        } else {
          // Show suggestions for medium/low confidence
          setShowSuggestions(true)
          toast.success('Address found. Please confirm.', {
            duration: 3000
          })
        }
      } else {
        toast.error(data.error || 'Address not found. Please check and try again.', {
          duration: 4000
        })
      }
    } catch (error) {
      console.error('Error verifying address:', error)
      toast.error('Failed to verify address. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleSelectSuggestion = (address: VerifiedAddress) => {
    onChange(address.formattedAddress)
    onVerified?.(address)
    setVerifiedAddress(address)
    setVerified(true)
    setShowSuggestions(false)
    toast.success('✓ Address confirmed')
  }

  const getConfidenceColor = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'text-green-600 dark:text-green-400'
      case 'medium': return 'text-yellow-600 dark:text-yellow-400'
      case 'low': return 'text-orange-600 dark:text-orange-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getConfidenceLabel = (confidence: string) => {
    switch (confidence) {
      case 'high': return 'Exact match'
      case 'medium': return 'Approximate'
      case 'low': return 'General area'
      default: return ''
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="flex space-x-2">
        <div className="flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => {
              onChange(e.target.value)
              setVerified(false)
              setTouched(true)
            }}
            onBlur={() => setTouched(true)}
            placeholder={placeholder}
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white ${
              error || (touched && !verified && showVerification)
                ? 'border-red-500 dark:border-red-500'
                : verified
                ? 'border-green-500 dark:border-green-500'
                : 'border-gray-300 dark:border-gray-600'
            }`}
          />
        </div>

        {showVerification && (
          <button
            type="button"
            onClick={handleVerify}
            disabled={verifying || !value || value.length < 5}
            className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold whitespace-nowrap"
          >
            {verifying ? (
              <span className="flex items-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verifying...
              </span>
            ) : verified ? (
              '✓ Verified'
            ) : (
              'Verify'
            )}
          </button>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {/* Verification Warning */}
      {showVerification && touched && !verified && value.length >= 5 && !verifying && (
        <p className="text-sm text-yellow-600 dark:text-yellow-400 flex items-center">
          ⚠️ Please verify this address to continue
        </p>
      )}

      {/* Verified Badge */}
      {verified && verifiedAddress && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <span className="text-green-600 dark:text-green-400 text-xl">✓</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                Address Verified
              </p>
              <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                {verifiedAddress.formattedAddress}
              </p>
              <p className={`text-xs mt-1 ${getConfidenceColor(verifiedAddress.confidence)}`}>
                {getConfidenceLabel(verifiedAddress.confidence)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-800 px-4 py-2 border-b border-gray-300 dark:border-gray-600">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              Did you mean one of these?
            </p>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className="w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {suggestion.formattedAddress}
                </p>
                <p className={`text-xs mt-1 ${getConfidenceColor(suggestion.confidence)}`}>
                  {getConfidenceLabel(suggestion.confidence)}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Helper Text */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Enter a full address including street, suburb, and city
      </p>
    </div>
  )
}

// Simple version without verification UI (just validates in background)
export function SimpleAddressInput({
  value,
  onChange,
  onVerified,
  label = 'Address',
  placeholder = 'Enter your address...',
  required = false
}: Omit<AddressInputProps, 'showVerification' | 'autoVerify' | 'error'>) {
  return (
    <AddressInput
      value={value}
      onChange={onChange}
      onVerified={onVerified}
      label={label}
      placeholder={placeholder}
      required={required}
      showVerification={false}
      autoVerify={true}
    />
  )
}
