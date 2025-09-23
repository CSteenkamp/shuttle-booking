'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import toast from 'react-hot-toast'

interface SavedAddress {
  id: string
  name: string
  address: string
  latitude?: number
  longitude?: number
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

interface SavedAddressesManagerProps {
  onAddressSelect?: (address: SavedAddress) => void
  showSelectButton?: boolean
}

export default function SavedAddressesManager({ onAddressSelect, showSelectButton = false }: SavedAddressesManagerProps) {
  const { data: session } = useSession()
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    setAsDefault: false
  })

  useEffect(() => {
    if (session) {
      fetchSavedAddresses()
    }
  }, [session])

  const fetchSavedAddresses = async () => {
    try {
      const response = await fetch('/api/user/saved-addresses')
      if (response.ok) {
        const data = await response.json()
        setSavedAddresses(data)
      }
    } catch (error) {
      console.error('Error fetching saved addresses:', error)
      toast.error('Failed to load saved addresses')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.address.trim()) {
      toast.error('Name and address are required')
      return
    }

    try {
      const url = editingAddress 
        ? `/api/user/saved-addresses/${editingAddress.id}`
        : '/api/user/saved-addresses'
      
      const method = editingAddress ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success(editingAddress ? 'Address updated!' : 'Address saved!')
        fetchSavedAddresses()
        resetForm()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save address')
      }
    } catch (error) {
      console.error('Error saving address:', error)
      toast.error('Failed to save address')
    }
  }

  const handleEdit = (address: SavedAddress) => {
    setEditingAddress(address)
    setFormData({
      name: address.name,
      address: address.address,
      setAsDefault: address.isDefault
    })
    setShowAddForm(true)
  }

  const handleDelete = async (addressId: string) => {
    if (!confirm('Are you sure you want to delete this address?')) return

    try {
      const response = await fetch(`/api/user/saved-addresses/${addressId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('Address deleted!')
        fetchSavedAddresses()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete address')
      }
    } catch (error) {
      console.error('Error deleting address:', error)
      toast.error('Failed to delete address')
    }
  }

  const handleSetDefault = async (addressId: string) => {
    try {
      const response = await fetch('/api/user/default-pickup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ savedAddressId: addressId })
      })

      if (response.ok) {
        toast.success('Default pickup location updated!')
        fetchSavedAddresses()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to set default')
      }
    } catch (error) {
      console.error('Error setting default:', error)
      toast.error('Failed to set default')
    }
  }

  const resetForm = () => {
    setFormData({ name: '', address: '', setAsDefault: false })
    setEditingAddress(null)
    setShowAddForm(false)
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Saved Pickup Locations
        </h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Add New Address
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border">
          <h4 className="font-medium text-gray-900 dark:text-white mb-4">
            {editingAddress ? 'Edit Address' : 'Add New Address'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Address Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Home, Work, School"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Street Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Enter full address"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="setAsDefault"
                checked={formData.setAsDefault}
                onChange={(e) => setFormData(prev => ({ ...prev, setAsDefault: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="setAsDefault" className="ml-2 text-sm text-gray-700 dark:text-gray-200">
                Set as default pickup location
              </label>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                {editingAddress ? 'Update' : 'Save'} Address
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Saved Addresses List */}
      <div className="space-y-3">
        {savedAddresses.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📍</span>
            </div>
            <p className="font-medium">No saved addresses yet</p>
            <p className="text-sm">Add your frequently used pickup locations for faster booking</p>
          </div>
        ) : (
          savedAddresses.map((address) => (
            <div
              key={address.id}
              className={`p-4 rounded-lg border ${
                address.isDefault
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      {address.name}
                    </h4>
                    {address.isDefault && (
                      <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {address.address}
                  </p>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {showSelectButton && (
                    <button
                      onClick={() => onAddressSelect?.(address)}
                      className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-emerald-600 hover:to-green-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center space-x-1"
                    >
                      <span>✓</span>
                      <span>Select</span>
                    </button>
                  )}
                  {!address.isDefault && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                    >
                      Set Default
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(address)}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(address.id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-xs font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}