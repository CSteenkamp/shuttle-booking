'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import AdminLayout from '@/components/admin/AdminLayout'

interface CreditTransaction {
  id: string
  type: string
  amount: number
  description: string | null
  createdAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface User {
  id: string
  name: string | null
  email: string
  creditBalance?: {
    credits: number
  }
}

export default function CreditManagement() {
  const { data: session, status } = useSession()
  const [transactions, setTransactions] = useState<CreditTransaction[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState('')
  const [adjustmentAmount, setAdjustmentAmount] = useState('')
  const [adjustmentReason, setAdjustmentReason] = useState('')
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      redirect('/auth/signin')
    }
  }, [session, status])

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    // Filter users based on search term
    if (!userSearchTerm.trim()) {
      setFilteredUsers(users)
    } else {
      const filtered = users.filter(user => 
        user.name?.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearchTerm.toLowerCase())
      )
      setFilteredUsers(filtered)
    }
  }, [users, userSearchTerm])

  const fetchData = async () => {
    try {
      const [transactionsResponse, usersResponse] = await Promise.all([
        fetch('/api/admin/credits/transactions'),
        fetch('/api/admin/users')
      ])

      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json()
        setTransactions(transactionsData)
      }

      if (usersResponse.ok) {
        const usersData = await usersResponse.json()
        // Include all users for credit management
        setUsers(usersData)
        setFilteredUsers(usersData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const adjustUserCredits = async (userId: string, amount: number, reason: string) => {
    try {
      const response = await fetch('/api/admin/credits/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          amount,
          description: reason
        }),
      })

      if (response.ok) {
        alert('Credits adjusted successfully')
        fetchData()
        setSelectedUser('')
        setAdjustmentAmount('')
        setAdjustmentReason('')
        setUserSearchTerm('')
      } else {
        const errorData = await response.json()
        alert(`Failed to adjust credits: ${errorData.error}`)
      }
    } catch (error) {
      console.error('Error adjusting credits:', error)
      alert('Error adjusting credits')
    }
  }


  const handleIndividualAdjustment = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedUser || !adjustmentAmount || !adjustmentReason) {
      alert('Please fill in all fields')
      return
    }

    const amount = parseInt(adjustmentAmount)
    if (isNaN(amount)) {
      alert('Please enter a valid amount')
      return
    }

    adjustUserCredits(selectedUser, amount, adjustmentReason)
  }

  const filteredTransactions = transactions.filter(transaction => {
    if (filterType === 'all') return true
    return transaction.type === filterType
  })

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
            Credit Management
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Manage user credits, adjustments, and transaction history
          </p>
        </div>

        <div className="max-w-2xl mb-8">
          {/* Individual Credit Adjustment */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">💳</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Individual Adjustment</h2>
            </div>

            <form onSubmit={handleIndividualAdjustment} className="space-y-4">
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  👤 Select User
                </label>
                
                {/* Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2 pl-10 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm text-gray-900 dark:text-white text-sm"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* User Dropdown */}
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full border-2 border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-gradient-to-r from-white to-gray-50 dark:from-gray-700 dark:to-gray-800 backdrop-blur-sm text-gray-900 dark:text-white font-medium shadow-lg hover:shadow-xl"
                  required
                >
                  <option value="">
                    {filteredUsers.length === 0 
                      ? userSearchTerm 
                        ? "No users found matching search"
                        : "No users available"
                      : `Choose from ${filteredUsers.length} user${filteredUsers.length !== 1 ? 's' : ''}`
                    }
                  </option>
                  {filteredUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      💳 {user.name || user.email} • {user.creditBalance?.credits || 0} credits • {user.email}
                    </option>
                  ))}
                </select>

                {/* User Stats */}
                {filteredUsers.length > 0 && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <span>📊 {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found</span>
                    {userSearchTerm && (
                      <button
                        type="button"
                        onClick={() => setUserSearchTerm('')}
                        className="text-blue-500 hover:text-blue-600 underline"
                      >
                        Clear search
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Credit Adjustment
                </label>
                <input
                  type="number"
                  value={adjustmentAmount}
                  onChange={(e) => setAdjustmentAmount(e.target.value)}
                  placeholder="Enter amount (positive to add, negative to remove)"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Reason
                </label>
                <input
                  type="text"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Reason for adjustment"
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
              >
                Adjust Credits
              </button>
            </form>
          </div>

        </div>

        {/* Transaction History */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">📊</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Transaction History</h2>
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white"
            >
              <option value="all">All Transactions</option>
              <option value="PURCHASE">Purchases</option>
              <option value="USAGE">Usage</option>
              <option value="REFUND">Refunds</option>
              <option value="ADMIN_ADJUSTMENT">Admin Adjustments</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {transaction.user.name || 'No name'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {transaction.user.email}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        transaction.type === 'PURCHASE' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                        transaction.type === 'USAGE' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                        transaction.type === 'REFUND' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                        'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                      }`}>
                        {transaction.type}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className={`text-sm font-medium ${
                        transaction.type === 'USAGE' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                      }`}>
                        {transaction.type === 'USAGE' ? '-' : '+'}{transaction.amount}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {transaction.description || 'No description'}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(transaction.createdAt).toLocaleDateString()} {new Date(transaction.createdAt).toLocaleTimeString()}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">💳</span>
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">No transactions found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Transactions will appear here as they occur</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}