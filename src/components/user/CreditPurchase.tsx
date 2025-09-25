'use client'

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'

interface CreditPackage {
  id: string
  name: string
  credits: number
  price: number
  isPopular: boolean
  regularPrice: number
  savings: number
  savingsPercentage: number
  pricePerCredit: number
}

interface CreditBalance {
  credits: number
}

export default function CreditPurchase() {
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [creditBalance, setCreditBalance] = useState<CreditBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [packagesResponse, balanceResponse] = await Promise.all([
        fetch('/api/user/credit-packages'),
        fetch('/api/user/credits')
      ])

      if (packagesResponse.ok) {
        const packagesData = await packagesResponse.json()
        setPackages(packagesData)
      }

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json()
        setCreditBalance(balanceData)
      }
    } catch (error) {
      console.error('Error fetching credit data:', error)
      toast.error('Failed to load credit information')
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = async (packageId: string, packageName: string) => {
    setPurchasing(packageId)

    try {
      const response = await fetch('/api/payments/initiate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packageId }),
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data.success && data.paymentUrl) {
          toast.loading('Redirecting to PayFast...', { duration: 2000 })
          
          // Redirect to PayFast payment page
          window.location.href = data.paymentUrl
        } else {
          toast.error('Failed to initiate payment')
        }
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to initiate payment')
      }
    } catch (error) {
      console.error('Error initiating payment:', error)
      toast.error('Failed to initiate payment. Please try again.')
    } finally {
      setPurchasing(null)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-500 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading credit packages...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Current Balance */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border-2 border-emerald-200 dark:border-emerald-600 rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xl font-bold">💰</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-200">
                Current Balance
              </h3>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Available credits for booking trips
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-emerald-900 dark:text-emerald-200">
              {creditBalance?.credits || 0}
            </div>
            <div className="text-sm text-emerald-700 dark:text-emerald-300">
              credits
            </div>
          </div>
        </div>
      </div>

      {/* Purchase Options */}
      <div>
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm font-bold">🛒</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Purchase Credits
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Choose a credit package to add to your account
            </p>
          </div>
        </div>

        {packages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📦</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No packages available
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Credit packages will appear here when available.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`relative bg-white dark:bg-gray-800 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
                  pkg.isPopular
                    ? 'border-indigo-500 shadow-lg scale-105'
                    : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300'
                }`}
              >
                {/* Popular Badge */}
                {pkg.isPopular && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      MOST POPULAR
                    </div>
                  </div>
                )}

                <div className="p-6">
                  {/* Package Header */}
                  <div className="text-center mb-4">
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      {pkg.name}
                    </h4>
                    <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                      R{pkg.price.toFixed(0)}
                    </div>
                    {pkg.savings > 0 && (
                      <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                        Save R{pkg.savings.toFixed(0)} ({pkg.savingsPercentage}%)
                      </div>
                    )}
                  </div>

                  {/* Package Details */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Credits:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {pkg.credits}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                      <span className="text-gray-600 dark:text-gray-400">Price per credit:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        R{pkg.pricePerCredit.toFixed(2)}
                      </span>
                    </div>
                    {pkg.savings > 0 && (
                      <div className="flex items-center justify-between py-2">
                        <span className="text-gray-600 dark:text-gray-400">Regular price:</span>
                        <span className="line-through text-gray-500 dark:text-gray-500">
                          R{pkg.regularPrice.toFixed(0)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Purchase Button */}
                  <button
                    onClick={() => handlePurchase(pkg.id, pkg.name)}
                    disabled={purchasing === pkg.id}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200 ${
                      pkg.isPopular
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg'
                        : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {purchasing === pkg.id ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      `Purchase ${pkg.name}`
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Information */}
      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-600 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="w-5 h-5 text-blue-500 mt-0.5">
            <svg fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-1">
              Secure Payment with PayFast
            </p>
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Pay with credit card, EFT, or mobile payment</li>
              <li>• Credits added automatically after payment</li>
              <li>• Secure processing by PayFast South Africa</li>
              <li>• Email receipt sent for all transactions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}