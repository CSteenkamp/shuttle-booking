'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import AdminLayout from '@/components/admin/AdminLayout'
import CalendarManagement from '@/components/admin/CalendarManagement'
import toast from 'react-hot-toast'

interface Setting {
  key: string
  value: string
  description: string
}

interface SettingsGroup {
  title: string
  icon: string
  description: string
  settings: Setting[]
}

export default function AdminSettingsPage() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('general')
  const [settings, setSettings] = useState<Record<string, string>>({})
  
  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      redirect('/admin')
    }
  }, [session, status])

  useEffect(() => {
    if (session) {
      fetchSettings()
    }
  }, [session])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/settings')
      if (response.ok) {
        const data = await response.json()
        const settingsMap: Record<string, string> = {}
        data.forEach((setting: Setting) => {
          settingsMap[setting.key] = setting.value
        })
        setSettings(settingsMap)
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (key: string, value: string) => {
    setSaving(key)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      })

      if (response.ok) {
        setSettings(prev => ({ ...prev, [key]: value }))
        toast.success('Setting updated successfully')
      } else {
        toast.error('Failed to update setting')
      }
    } catch (error) {
      console.error('Error updating setting:', error)
      toast.error('Failed to update setting')
    } finally {
      setSaving(null)
    }
  }

  const settingsGroups: SettingsGroup[] = [
    {
      title: 'General Settings',
      icon: '⚙️',
      description: 'Basic system configuration and operational parameters',
      settings: [
        {
          key: 'system_name',
          value: settings.system_name || 'Tjoef-Tjaf',
          description: 'System name displayed throughout the application'
        },
        {
          key: 'company_name',
          value: settings.company_name || 'Tjoef-Tjaf Transportation',
          description: 'Company name for emails and official documents'
        },
        {
          key: 'support_email',
          value: settings.support_email || 'support@tjoeftjaf.com',
          description: 'Email address for customer support and inquiries'
        },
        {
          key: 'max_passengers_per_trip',
          value: settings.max_passengers_per_trip || '4',
          description: 'Maximum number of passengers allowed per trip'
        },
        {
          key: 'booking_advance_days',
          value: settings.booking_advance_days || '30',
          description: 'Maximum days in advance that bookings can be made'
        },
        {
          key: 'cancellation_hours',
          value: settings.cancellation_hours || '24',
          description: 'Hours before trip start that cancellations are allowed'
        }
      ]
    },
    {
      title: 'Driver Configuration',
      icon: '🚐',
      description: 'Driver-specific settings and calendar integration',
      settings: [
        {
          key: 'driver_name',
          value: settings.driver_name || 'Christiaan',
          description: 'Primary driver name for calendar invites and communications'
        },
        {
          key: 'driver_email',
          value: settings.driver_email || '',
          description: 'Driver email address for calendar invites and trip notifications'
        },
        {
          key: 'driver_phone',
          value: settings.driver_phone || '',
          description: 'Driver phone number for emergency contact'
        },
        {
          key: 'auto_calendar_sync',
          value: settings.auto_calendar_sync || 'true',
          description: 'Automatically sync new bookings to driver calendar'
        }
      ]
    },
    {
      title: 'Email Configuration',
      icon: '📧',
      description: 'Email service settings and notification preferences',
      settings: [
        {
          key: 'email_service_enabled',
          value: settings.email_service_enabled || 'true',
          description: 'Enable/disable email notifications system-wide'
        },
        {
          key: 'email_from_name',
          value: settings.email_from_name || 'Tjoef-Tjaf',
          description: 'Display name for outgoing emails'
        },
        {
          key: 'booking_confirmation_enabled',
          value: settings.booking_confirmation_enabled || 'true',
          description: 'Send automatic booking confirmation emails'
        },
        {
          key: 'reminder_24h_enabled',
          value: settings.reminder_24h_enabled || 'true',
          description: 'Send 24-hour trip reminder emails'
        },
        {
          key: 'reminder_1h_enabled',
          value: settings.reminder_1h_enabled || 'true',
          description: 'Send 1-hour trip reminder emails'
        }
      ]
    },
    {
      title: 'Pricing & Credits',
      icon: '💰',
      description: 'Financial settings and credit system configuration',
      settings: [
        {
          key: 'creditValue',
          value: settings.creditValue || '25',
          description: 'Cost per credit in South African Rand (R)'
        },
        {
          key: 'baseTripCost',
          value: settings.baseTripCost || '1',
          description: 'Base credits required per passenger per trip'
        },
        {
          key: 'credit_expiry_days',
          value: settings.credit_expiry_days || '365',
          description: 'Days until purchased credits expire (0 = never)'
        },
        {
          key: 'refund_enabled',
          value: settings.refund_enabled || 'true',
          description: 'Allow credit refunds for cancelled trips'
        }
      ]
    },
    {
      title: 'Operational Hours',
      icon: '🕒',
      description: 'Business hours and scheduling constraints',
      settings: [
        {
          key: 'business_start_hour',
          value: settings.business_start_hour || '6',
          description: 'Earliest hour for trip scheduling (24-hour format)'
        },
        {
          key: 'business_end_hour',
          value: settings.business_end_hour || '22',
          description: 'Latest hour for trip scheduling (24-hour format)'
        },
        {
          key: 'trip_duration_minutes',
          value: settings.trip_duration_minutes || '20',
          description: 'Default trip duration in minutes'
        },
        {
          key: 'time_slot_interval',
          value: settings.time_slot_interval || '20',
          description: 'Time interval between available booking slots (minutes)'
        },
        {
          key: 'weekend_service_enabled',
          value: settings.weekend_service_enabled || 'true',
          description: 'Allow bookings on weekends'
        }
      ]
    },
    {
      title: 'Google Calendar',
      icon: '📅',
      description: 'Google Calendar integration and availability checking',
      settings: [
        {
          key: 'google_calendar_service_account',
          value: settings.google_calendar_service_account || '',
          description: 'Google Cloud Service Account JSON (for calendar integration)'
        },
        {
          key: 'google_calendar_id',
          value: settings.google_calendar_id || '',
          description: 'Google Calendar ID to sync events with'
        },
        {
          key: 'google_calendar_impersonate_email',
          value: settings.google_calendar_impersonate_email || '',
          description: 'Email to impersonate (for domain-wide delegation, optional)'
        },
        {
          key: 'calendar_availability_enabled',
          value: settings.calendar_availability_enabled || 'true',
          description: 'Enable calendar-based availability checking for booking conflicts'
        },
        {
          key: 'calendar_sync_enabled',
          value: settings.calendar_sync_enabled || 'true',
          description: 'Automatically sync new bookings to Google Calendar'
        }
      ]
    },
    {
      title: 'Security & Access',
      icon: '🔒',
      description: 'Security settings and access controls',
      settings: [
        {
          key: 'session_timeout_hours',
          value: settings.session_timeout_hours || '24',
          description: 'Hours before user sessions expire'
        },
        {
          key: 'max_login_attempts',
          value: settings.max_login_attempts || '5',
          description: 'Maximum failed login attempts before account lockout'
        },
        {
          key: 'lockout_duration_minutes',
          value: settings.lockout_duration_minutes || '30',
          description: 'Account lockout duration in minutes'
        },
        {
          key: 'require_phone_verification',
          value: settings.require_phone_verification || 'false',
          description: 'Require phone number verification for new accounts'
        }
      ]
    }
  ]

  const tabs = [
    { id: 'general', name: 'General', icon: '⚙️' },
    { id: 'driver', name: 'Driver', icon: '🚐' },
    { id: 'email', name: 'Email', icon: '📧' },
    { id: 'pricing', name: 'Pricing', icon: '💰' },
    { id: 'hours', name: 'Hours', icon: '🕒' },
    { id: 'calendar', name: 'Calendar', icon: '📅' },
    { id: 'calendar-test', name: 'Cal Test', icon: '🧪' },
    { id: 'security', name: 'Security', icon: '🔒' }
  ]

  const getActiveGroup = () => {
    const groupMap: Record<string, number> = {
      general: 0,
      driver: 1,
      email: 2,
      pricing: 3,
      hours: 4,
      calendar: 5,
      security: 6
    }
    return settingsGroups[groupMap[activeTab]] || settingsGroups[0]
  }

  const renderSettingInput = (setting: Setting) => {
    const isBoolean = setting.value === 'true' || setting.value === 'false'
    const isNumber = /^\d+$/.test(setting.value)
    const isLargeText = setting.key.includes('service_account') || setting.value.length > 100

    if (isBoolean) {
      return (
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={setting.value === 'true'}
            onChange={(e) => updateSetting(setting.key, e.target.checked ? 'true' : 'false')}
            disabled={saving === setting.key}
          />
          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
        </label>
      )
    }

    if (isLargeText) {
      return (
        <textarea
          value={setting.value}
          onChange={(e) => updateSetting(setting.key, e.target.value)}
          disabled={saving === setting.key}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 font-mono text-sm"
          placeholder={setting.description}
        />
      )
    }

    return (
      <input
        type={isNumber ? 'number' : 'text'}
        value={setting.value}
        onChange={(e) => updateSetting(setting.key, e.target.value)}
        disabled={saving === setting.key}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
        placeholder={setting.description}
      />
    )
  }

  if (status === 'loading' || loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-pulse text-center">
            <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-2xl mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48 mx-auto mb-2"></div>
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-32 mx-auto"></div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  const activeGroup = getActiveGroup()

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              ⚙️ System Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Configure system-wide settings and operational parameters
            </p>
          </div>
        </div>

        {/* Settings Navigation */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-8 gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                activeTab === tab.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-2">{tab.icon}</div>
                <div className="text-sm font-medium">{tab.name}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Settings Content */}
        {activeTab === 'calendar-test' ? (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-3xl">🧪</span>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Calendar Testing & Management
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Test and manage Google Calendar integration functionality
                </p>
              </div>
            </div>
            <CalendarManagement />
          </div>
        ) : (
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50">
            {/* Group Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <span className="text-3xl">{activeGroup.icon}</span>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {activeGroup.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400">
                    {activeGroup.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Settings List */}
            <div className="p-6">
              <div className="space-y-6">
                {activeGroup.settings.map((setting) => (
                  <div key={setting.key} className="flex flex-col space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <label className="text-sm font-semibold text-gray-900 dark:text-white">
                          {setting.description}
                        </label>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Key: {setting.key}
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {saving === setting.key && (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        )}
                        <div className="w-48">
                          {renderSettingInput(setting)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* System Information */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            📊 System Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {Object.keys(settings).length}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Settings Configured</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                ✓
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">System Active</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                v1.0
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">System Version</div>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {new Date().toLocaleDateString()}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Last Updated</div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}