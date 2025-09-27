'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

interface PricingSettings {
  creditValue: number
  baseTripCost: number
  discountRules: DiscountRule[]
  bulkPurchaseDiscounts: BulkDiscount[]
}

interface DiscountRule {
  id: string
  name: string
  type: 'PERCENTAGE' | 'FIXED_AMOUNT'
  value: number
  minPurchase?: number
  description: string
  isActive: boolean
}

interface BulkDiscount {
  id: string
  minQuantity: number
  discountPercentage: number
  isActive: boolean
}

interface CreditPackage {
  id: string
  name: string
  credits: number
  price: number
  isPopular: boolean
  isActive: boolean
}

export default function PricingManagement() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Pricing settings state
  const [creditValue, setCreditValue] = useState(25)
  const [baseTripCost, setBaseTripCost] = useState(1)
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([])
  const [discountRules, setDiscountRules] = useState<DiscountRule[]>([])
  const [bulkDiscounts, setBulkDiscounts] = useState<BulkDiscount[]>([])
  
  // Modal states
  const [showPackageModal, setShowPackageModal] = useState(false)
  const [showDiscountModal, setShowDiscountModal] = useState(false)
  const [showBulkDiscountModal, setShowBulkDiscountModal] = useState(false)
  const [editingPackage, setEditingPackage] = useState<CreditPackage | null>(null)
  const [editingDiscount, setEditingDiscount] = useState<DiscountRule | null>(null)
  const [editingBulkDiscount, setEditingBulkDiscount] = useState<BulkDiscount | null>(null)

  // New item forms
  const [newPackage, setNewPackage] = useState({
    name: '',
    credits: 0,
    price: 0,
    isPopular: false,
    isActive: true
  })
  
  const [newDiscount, setNewDiscount] = useState({
    name: '',
    type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT',
    value: 0,
    minPurchase: 0,
    description: '',
    isActive: true
  })
  
  const [newBulkDiscount, setNewBulkDiscount] = useState({
    minQuantity: 0,
    discountPercentage: 0,
    isActive: true
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      redirect('/auth/signin')
    }
  }, [session, status])

  useEffect(() => {
    fetchPricingData()
  }, [])

  const fetchPricingData = async () => {
    try {
      const [settingsRes, packagesRes, discountsRes, bulkDiscountsRes] = await Promise.all([
        fetch('/api/admin/pricing/settings'),
        fetch('/api/admin/pricing/packages'),
        fetch('/api/admin/pricing/discounts'),
        fetch('/api/admin/pricing/bulk-discounts')
      ])

      if (settingsRes.ok) {
        const settings = await settingsRes.json()
        setCreditValue(settings.creditValue || 25)
        setBaseTripCost(settings.baseTripCost || 1)
      }

      if (packagesRes.ok) {
        const packages = await packagesRes.json()
        setCreditPackages(packages)
      }

      if (discountsRes.ok) {
        const discounts = await discountsRes.json()
        setDiscountRules(discounts)
      }

      if (bulkDiscountsRes.ok) {
        const bulkDiscounts = await bulkDiscountsRes.json()
        setBulkDiscounts(bulkDiscounts)
      }
    } catch (error) {
      console.error('Error fetching pricing data:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/pricing/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creditValue,
          baseTripCost
        })
      })

      if (response.ok) {
        alert('Settings updated successfully!')
      } else {
        const error = await response.json()
        alert(`Failed to update settings: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      alert('Error updating settings')
    } finally {
      setSaving(false)
    }
  }

  const addCreditPackage = async () => {
    if (!newPackage.name || newPackage.credits <= 0 || newPackage.price <= 0) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const response = await fetch('/api/admin/pricing/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPackage)
      })

      if (response.ok) {
        alert('Credit package added successfully!')
        fetchPricingData()
        setShowPackageModal(false)
        setNewPackage({ name: '', credits: 0, price: 0, isPopular: false, isActive: true })
      } else {
        const error = await response.json()
        alert(`Failed to add package: ${error.error}`)
      }
    } catch (error) {
      console.error('Error adding package:', error)
      alert('Error adding package')
    }
  }

  const updateCreditPackage = async (packageId: string, updates: Partial<CreditPackage>) => {
    try {
      const response = await fetch(`/api/admin/pricing/packages/${packageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (response.ok) {
        alert('Package updated successfully!')
        fetchPricingData()
        setEditingPackage(null)
      } else {
        const error = await response.json()
        alert(`Failed to update package: ${error.error}`)
      }
    } catch (error) {
      console.error('Error updating package:', error)
      alert('Error updating package')
    }
  }

  const deleteCreditPackage = async (packageId: string) => {
    if (!confirm('Are you sure you want to delete this credit package?')) return

    try {
      const response = await fetch(`/api/admin/pricing/packages/${packageId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Package deleted successfully!')
        fetchPricingData()
      } else {
        const error = await response.json()
        alert(`Failed to delete package: ${error.error}`)
      }
    } catch (error) {
      console.error('Error deleting package:', error)
      alert('Error deleting package')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <AdminLayout>
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Pricing Control
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage credit values, pricing packages, and discount rules
          </p>
        </div>

        {/* Core Settings */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Core Pricing Settings</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Credit Value (R per credit)
              </label>
              <input
                type="number"
                value={creditValue}
                onChange={(e) => setCreditValue(Number(e.target.value))}
                min="1"
                step="0.01"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                How much each credit costs in South African Rand
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Base Trip Cost (credits)
              </label>
              <input
                type="number"
                value={baseTripCost}
                onChange={(e) => setBaseTripCost(Number(e.target.value))}
                min="1"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Credits required per passenger per trip
              </p>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={updateSettings}
              disabled={saving}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed transition-all duration-200 font-semibold"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          {/* Current Pricing Summary */}
          <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border border-emerald-200 dark:border-emerald-600 rounded-lg">
            <h3 className="font-semibold text-emerald-900 dark:text-emerald-200 mb-2">Current Pricing</h3>
            <div className="text-sm text-emerald-800 dark:text-emerald-300">
              <p>• 1 Credit = R{creditValue}</p>
              <p>• 1 Trip = {baseTripCost} credit{baseTripCost !== 1 ? 's' : ''}</p>
              <p>• Cost per trip = R{(creditValue * baseTripCost).toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Credit Packages */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Credit Packages</h2>
            <button
              onClick={() => setShowPackageModal(true)}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 font-semibold"
            >
              Add Package
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {creditPackages.map((pkg) => (
              <div key={pkg.id} className={`border-2 rounded-xl p-4 transition-all duration-200 ${
                pkg.isPopular 
                  ? 'border-gradient-to-r from-purple-500 to-pink-500 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30' 
                  : 'border-gray-200 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50'
              }`}>
                {pkg.isPopular && (
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full inline-block mb-2">
                    POPULAR
                  </div>
                )}
                
                <h3 className="font-bold text-gray-900 dark:text-white">{pkg.name}</h3>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 my-2">
                  {pkg.credits} Credits
                </div>
                <div className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-4">
                  R{pkg.price}
                </div>
                
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  R{(pkg.price / pkg.credits).toFixed(2)} per credit
                  {pkg.price / pkg.credits < creditValue && (
                    <span className="text-green-600 dark:text-green-400 ml-1">
                      (Save R{((creditValue - (pkg.price / pkg.credits)) * pkg.credits).toFixed(2)})
                    </span>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => setEditingPackage(pkg)}
                    className="flex-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 py-1 px-2 rounded text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteCreditPackage(pkg.id)}
                    className="flex-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 py-1 px-2 rounded text-sm hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
                
                {!pkg.isActive && (
                  <div className="mt-2 text-xs text-orange-600 dark:text-orange-400 font-medium">
                    Inactive
                  </div>
                )}
              </div>
            ))}
          </div>

          {creditPackages.length === 0 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💳</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No credit packages configured</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Add packages to offer credit bundles to customers</p>
            </div>
          )}
        </div>

        {/* Add Package Modal */}
        {showPackageModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Add Credit Package</h3>
                  <button
                    onClick={() => setShowPackageModal(false)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Package Name *
                    </label>
                    <input
                      type="text"
                      value={newPackage.name}
                      onChange={(e) => setNewPackage({...newPackage, name: e.target.value})}
                      placeholder="e.g., Starter Pack"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Credits *
                    </label>
                    <input
                      type="number"
                      value={newPackage.credits}
                      onChange={(e) => setNewPackage({...newPackage, credits: Number(e.target.value)})}
                      min="1"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Price (R) *
                    </label>
                    <input
                      type="number"
                      value={newPackage.price}
                      onChange={(e) => setNewPackage({...newPackage, price: Number(e.target.value)})}
                      min="1"
                      step="0.01"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newPackage.isPopular}
                        onChange={(e) => setNewPackage({...newPackage, isPopular: e.target.checked})}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">Mark as popular</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newPackage.isActive}
                        onChange={(e) => setNewPackage({...newPackage, isActive: e.target.checked})}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">Active</span>
                    </label>
                  </div>
                </div>
                
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setShowPackageModal(false)}
                    className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addCreditPackage}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Package
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edit Package Modal */}
        {editingPackage && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Edit Credit Package</h3>
                  <button
                    onClick={() => setEditingPackage(null)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Package Name
                    </label>
                    <input
                      type="text"
                      value={editingPackage.name}
                      onChange={(e) => setEditingPackage({...editingPackage, name: e.target.value})}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Credits
                    </label>
                    <input
                      type="number"
                      value={editingPackage.credits}
                      onChange={(e) => setEditingPackage({...editingPackage, credits: Number(e.target.value)})}
                      min="1"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                      Price (R)
                    </label>
                    <input
                      type="number"
                      value={editingPackage.price}
                      onChange={(e) => setEditingPackage({...editingPackage, price: Number(e.target.value)})}
                      min="1"
                      step="0.01"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editingPackage.isPopular}
                        onChange={(e) => setEditingPackage({...editingPackage, isPopular: e.target.checked})}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">Mark as popular</span>
                    </label>
                    
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={editingPackage.isActive}
                        onChange={(e) => setEditingPackage({...editingPackage, isActive: e.target.checked})}
                        className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700 dark:text-gray-200">Active</span>
                    </label>
                  </div>
                </div>
                
                <div className="flex space-x-3 mt-6">
                  <button
                    onClick={() => setEditingPackage(null)}
                    className="flex-1 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => updateCreditPackage(editingPackage.id, {
                      name: editingPackage.name,
                      credits: editingPackage.credits,
                      price: editingPackage.price,
                      isPopular: editingPackage.isPopular,
                      isActive: editingPackage.isActive
                    })}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}