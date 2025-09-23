'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

interface AdminLayoutProps {
  children: React.ReactNode
}

interface NavItem {
  id: string
  name: string
  href: string
  icon: string
  description: string
}

const navItems: NavItem[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    href: '/admin',
    icon: '📊',
    description: 'Overview & Analytics'
  },
  {
    id: 'users',
    name: 'Users',
    href: '/admin/users',
    icon: '👥',
    description: 'User Management'
  },
  {
    id: 'trips',
    name: 'Trips',
    href: '/admin/trips',
    icon: '🚐',
    description: 'Trip Management'
  },
  {
    id: 'bookings',
    name: 'Bookings',
    href: '/admin/bookings',
    icon: '📋',
    description: 'Booking Administration'
  },
  {
    id: 'credits',
    name: 'Credits',
    href: '/admin/credits',
    icon: '💳',
    description: 'Credit Management'
  },
  {
    id: 'locations',
    name: 'Locations',
    href: '/admin/locations',
    icon: '📍',
    description: 'Location Management'
  },
  {
    id: 'reports',
    name: 'Reports',
    href: '/admin/reports',
    icon: '📈',
    description: 'Analytics & Reports'
  },
  {
    id: 'settings',
    name: 'Settings',
    href: '/admin/settings',
    icon: '⚙️',
    description: 'System Configuration'
  },
  {
    id: 'audit',
    name: 'Audit Logs',
    href: '/admin/audit',
    icon: '📜',
    description: 'System Activity Logs'
  }
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { data: session } = useSession()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-indigo-900">
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm p-2 rounded-lg shadow-lg border border-gray-200/50 dark:border-gray-700/50"
        >
          <svg className="w-6 h-6 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-80 bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-r border-gray-200/50 dark:border-gray-700/50 transform transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">🚐</span>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  ShuttlePro Admin
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Management Dashboard</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
              
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`block w-full p-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border-2 border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300'
                      : 'hover:bg-gray-100/50 dark:hover:bg-gray-700/30 border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{item.icon}</span>
                    <div className="flex-1">
                      <h3 className={`font-semibold ${isActive ? 'text-purple-800 dark:text-purple-200' : 'text-gray-800 dark:text-gray-200'}`}>
                        {item.name}
                      </h3>
                      <p className={`text-xs ${isActive ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`}>
                        {item.description}
                      </p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs font-bold">👤</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                    {session?.user?.name || 'Admin'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Administrator</p>
                </div>
              </div>
              <ThemeToggle />
            </div>
            <div className="mt-3 flex space-x-2">
              <Link
                href="/"
                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-center"
              >
                Customer View
              </Link>
              <Link
                href="/profile"
                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-center"
              >
                Profile
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="lg:pl-80">
        <main className="min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}