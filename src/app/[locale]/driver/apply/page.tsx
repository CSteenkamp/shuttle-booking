'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useSession } from 'next-auth/react'

interface City {
  id: string
  name: string
  areas: Area[]
}

interface Area {
  id: string
  name: string
}

export default function DriverApplication() {
  const router = useRouter()
  const { data: session } = useSession()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [cities, setCities] = useState<City[]>([])
  const [loadingCities, setLoadingCities] = useState(true)

  const [formData, setFormData] = useState({
    // Account info (if not logged in)
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',

    // License & ID
    idNumber: '',
    licenseNumber: '',
    licenseExpiry: '',
    licenseType: 'Code 08 (EB)',
    yearsExperience: '',

    // Vehicle info
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehiclePlate: '',
    vehicleColor: '',
    vehicleSeats: '4',

    // City & Area selection
    preferredCityId: '',
    preferredAreaIds: [] as string[],

    // Banking (for payouts)
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    branchCode: '',

    // Custom rates (optional)
    requestCustomRates: false,
    baseRate: '',
    perMinuteRate: '',
    perKmRate: '',

    // Documents (would be file uploads in production)
    documentsNotes: ''
  })

  // Fetch cities and areas on mount
  useEffect(() => {
    fetchCities()
  }, [])

  const fetchCities = async () => {
    try {
      const response = await fetch('/api/cities?includeAreas=true')
      const data = await response.json()
      setCities(data.cities || [])
    } catch (error) {
      console.error('Error fetching cities:', error)
      setError('Failed to load cities')
    } finally {
      setLoadingCities(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const toggleArea = (areaId: string) => {
    setFormData(prev => ({
      ...prev,
      preferredAreaIds: prev.preferredAreaIds.includes(areaId)
        ? prev.preferredAreaIds.filter(id => id !== areaId)
        : [...prev.preferredAreaIds, areaId]
    }))
  }

  const validateStep = (step: number): boolean => {
    setError('')

    if (step === 1 && !session) {
      if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
        setError('Please fill in all required fields')
        return false
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        return false
      }
      if (formData.password.length < 8) {
        setError('Password must be at least 8 characters')
        return false
      }
    }

    if (step === 2) {
      if (!formData.licenseNumber || !formData.licenseExpiry || !formData.yearsExperience) {
        setError('Please complete all license information')
        return false
      }
    }

    if (step === 3) {
      if (!formData.vehicleMake || !formData.vehicleModel || !formData.vehiclePlate || !formData.vehicleColor) {
        setError('Please complete all vehicle information')
        return false
      }
    }

    if (step === 4) {
      if (!formData.preferredCityId || formData.preferredAreaIds.length === 0) {
        setError('Please select a city and at least one operational area')
        return false
      }
    }

    if (step === 5) {
      if (!formData.bankName || !formData.accountHolder || !formData.accountNumber) {
        setError('Please complete all banking information')
        return false
      }
    }

    return true
  }

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const prevStep = () => {
    setError('')
    setCurrentStep(prev => prev - 1)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateStep(currentStep)) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const applicationData: any = {
        // License info
        idNumber: formData.idNumber,
        licenseNumber: formData.licenseNumber,
        licenseExpiry: formData.licenseExpiry,
        licenseType: formData.licenseType,
        yearsExperience: parseInt(formData.yearsExperience),

        // Vehicle info
        vehicleMake: formData.vehicleMake,
        vehicleModel: formData.vehicleModel,
        vehicleYear: formData.vehicleYear ? parseInt(formData.vehicleYear) : null,
        vehiclePlate: formData.vehiclePlate,
        vehicleColor: formData.vehicleColor,
        vehicleSeats: parseInt(formData.vehicleSeats),

        // City & Areas
        preferredCityId: formData.preferredCityId,
        preferredAreaIds: formData.preferredAreaIds,

        // Banking
        bankDetails: {
          bankName: formData.bankName,
          accountHolder: formData.accountHolder,
          accountNumber: formData.accountNumber,
          branchCode: formData.branchCode
        },

        // Custom rates (if requested)
        customRates: formData.requestCustomRates ? {
          baseRate: formData.baseRate ? parseInt(formData.baseRate) : null,
          perMinuteRate: formData.perMinuteRate ? parseInt(formData.perMinuteRate) : null,
          perKmRate: formData.perKmRate ? parseInt(formData.perKmRate) : null
        } : null,

        // Additional notes
        documentsNotes: formData.documentsNotes
      }

      // If not logged in, include account creation data
      if (!session) {
        applicationData.name = formData.name
        applicationData.email = formData.email
        applicationData.phone = formData.phone
        applicationData.password = formData.password
      }

      const response = await fetch('/api/driver/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData),
      })

      const data = await response.json()

      if (response.ok) {
        router.push('/driver/apply/success')
      } else {
        setError(data.error || 'Failed to submit application')
      }
    } catch (err) {
      setError('An error occurred while submitting your application')
      console.error('Application error:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectedCity = cities.find(c => c.id === formData.preferredCityId)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-indigo-900 transition-colors duration-300">
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left Side - Branding & Info */}
        <div className="lg:w-2/5 flex items-center justify-center p-8 lg:p-12">
          <div className="max-w-md">
            {/* Logo */}
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">🚗</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Become a Driver
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Join our team</p>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-4">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Drive with
                <br />
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Tjoef-Tjaf
                </span>
              </h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                Be part of South Africa&apos;s premium shuttle service. Earn competitive rates while providing exceptional service.
              </p>

              <div className="space-y-3 pt-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">💰</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Competitive Earnings</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Set your own rates with admin approval</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">📅</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Flexible Schedule</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Sync with your calendar for automatic availability</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🎯</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Smart Assignment</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Automatic trip assignments in your area</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🛡️</span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Professional Support</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Full admin support and training provided</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Application Form */}
        <div className="lg:w-3/5 flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-2xl">
            {/* Progress Indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-between">
                {[1, 2, 3, 4, 5].map((step, idx) => (
                  <div key={step} className="flex items-center">
                    <div className={`flex flex-col items-center ${
                      currentStep === step ? 'text-indigo-600' :
                      currentStep > step ? 'text-emerald-600' :
                      'text-gray-400'
                    }`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        currentStep === step ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' :
                        currentStep > step ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-400'
                      }`}>
                        {currentStep > step ? '✓' : step}
                      </div>
                      <span className="text-xs mt-2 hidden md:block">
                        {step === 1 && (session ? 'Start' : 'Account')}
                        {step === 2 && 'License'}
                        {step === 3 && 'Vehicle'}
                        {step === 4 && 'Areas'}
                        {step === 5 && 'Banking'}
                      </span>
                    </div>
                    {idx < 4 && (
                      <div className={`w-8 md:w-12 h-1 rounded-full mx-2 ${
                        currentStep > step ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}></div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Form Card */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Step 1: Account Info (if not logged in) */}
                {currentStep === 1 && !session && (
                  <>
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Create Your Account
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        First, let&apos;s create your driver account
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            Email Address *
                          </label>
                          <input
                            type="email"
                            name="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="your@email.com"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="082 123 4567"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            Password *
                          </label>
                          <input
                            type="password"
                            name="password"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Min. 8 characters"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            Confirm Password *
                          </label>
                          <input
                            type="password"
                            name="confirmPassword"
                            required
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Confirm password"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Step 1 (or 2): License Information */}
                {((currentStep === 1 && session) || (currentStep === 2 && !session)) && (
                  <>
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Driver&apos;s License
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Provide your license information
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          ID Number (Optional)
                        </label>
                        <input
                          type="text"
                          name="idNumber"
                          value={formData.idNumber}
                          onChange={handleChange}
                          className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Your ID number"
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            License Number *
                          </label>
                          <input
                            type="text"
                            name="licenseNumber"
                            required
                            value={formData.licenseNumber}
                            onChange={handleChange}
                            className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="License number"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            License Expiry *
                          </label>
                          <input
                            type="date"
                            name="licenseExpiry"
                            required
                            value={formData.licenseExpiry}
                            onChange={handleChange}
                            className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            License Type *
                          </label>
                          <select
                            name="licenseType"
                            value={formData.licenseType}
                            onChange={handleChange}
                            className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="Code 08 (EB)">Code 08 (EB) - Light Vehicle</option>
                            <option value="Code 10 (C1)">Code 10 (C1) - Medium Vehicle</option>
                            <option value="Code 14 (C)">Code 14 (C) - Heavy Vehicle</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            Years of Experience *
                          </label>
                          <input
                            type="number"
                            name="yearsExperience"
                            required
                            min="1"
                            max="50"
                            value={formData.yearsExperience}
                            onChange={handleChange}
                            className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Years"
                          />
                        </div>
                      </div>

                      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          📋 <strong>Note:</strong> You&apos;ll need to upload documents (license, ID, PDP) after your application is submitted.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Step 3: Vehicle Information */}
                {((currentStep === 2 && session) || (currentStep === 3 && !session)) && (
                  <>
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Vehicle Information
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Tell us about the vehicle you'll be using
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            Vehicle Make *
                          </label>
                          <input
                            type="text"
                            name="vehicleMake"
                            required
                            value={formData.vehicleMake}
                            onChange={handleChange}
                            className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., Toyota"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            Vehicle Model *
                          </label>
                          <input
                            type="text"
                            name="vehicleModel"
                            required
                            value={formData.vehicleModel}
                            onChange={handleChange}
                            className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., Corolla"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            Year
                          </label>
                          <input
                            type="number"
                            name="vehicleYear"
                            min="1990"
                            max={new Date().getFullYear() + 1}
                            value={formData.vehicleYear}
                            onChange={handleChange}
                            className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="2020"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            License Plate *
                          </label>
                          <input
                            type="text"
                            name="vehiclePlate"
                            required
                            value={formData.vehiclePlate}
                            onChange={handleChange}
                            className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="ABC 123 GP"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                            Seats
                          </label>
                          <select
                            name="vehicleSeats"
                            value={formData.vehicleSeats}
                            onChange={handleChange}
                            className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="4">4 seats</option>
                            <option value="5">5 seats</option>
                            <option value="6">6 seats</option>
                            <option value="7">7 seats</option>
                            <option value="8">8+ seats</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Vehicle Color *
                        </label>
                        <input
                          type="text"
                          name="vehicleColor"
                          required
                          value={formData.vehicleColor}
                          onChange={handleChange}
                          className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="e.g., Silver, White, Black"
                        />
                      </div>

                      <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          🚗 <strong>Requirements:</strong> Vehicle must be well-maintained, clean, and pass safety inspections.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Step 4: Operational Areas */}
                {((currentStep === 3 && session) || (currentStep === 4 && !session)) && (
                  <>
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Operational Areas
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Select the city and areas where you'd like to operate
                      </p>
                    </div>

                    <div className="space-y-6">
                      {/* City Selection */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Primary City *
                        </label>
                        {loadingCities ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                          </div>
                        ) : (
                          <select
                            name="preferredCityId"
                            required
                            value={formData.preferredCityId}
                            onChange={handleChange}
                            className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          >
                            <option value="">Select a city</option>
                            {cities.map((city) => (
                              <option key={city.id} value={city.id}>
                                {city.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* Area Selection */}
                      {selectedCity && selectedCity.areas && selectedCity.areas.length > 0 && (
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
                            Operational Areas * <span className="text-sm font-normal text-gray-500">(Select at least one)</span>
                          </label>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {selectedCity.areas.map((area) => (
                              <button
                                key={area.id}
                                type="button"
                                onClick={() => toggleArea(area.id)}
                                className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                                  formData.preferredAreaIds.includes(area.id)
                                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                    : 'border-gray-300 dark:border-gray-600 bg-white/50 dark:bg-gray-700/50 hover:border-indigo-300'
                                }`}
                              >
                                <div className="flex items-center">
                                  <div className={`w-5 h-5 rounded flex items-center justify-center mr-3 ${
                                    formData.preferredAreaIds.includes(area.id)
                                      ? 'bg-indigo-600 text-white'
                                      : 'border-2 border-gray-300 dark:border-gray-600'
                                  }`}>
                                    {formData.preferredAreaIds.includes(area.id) && '✓'}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900 dark:text-white">{area.name}</p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                            Selected: {formData.preferredAreaIds.length} area{formData.preferredAreaIds.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      )}

                      {selectedCity && (!selectedCity.areas || selectedCity.areas.length === 0) && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-xl p-4">
                          <p className="text-sm text-yellow-700 dark:text-yellow-300">
                            ⚠️ No areas available in this city yet. Please contact admin.
                          </p>
                        </div>
                      )}

                      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 rounded-xl p-4">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          📍 <strong>Tip:</strong> You can operate in multiple areas. The first area you select will be your primary zone for trip assignments.
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Step 5: Banking & Rates */}
                {((currentStep === 4 && session) || (currentStep === 5 && !session)) && (
                  <>
                    <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Banking & Rates
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Setup your payment details and optional custom rates
                      </p>
                    </div>

                    <div className="space-y-6">
                      {/* Banking Details */}
                      <div className="bg-emerald-50 dark:bg-emerald-900/30 border-2 border-emerald-200 dark:border-emerald-700 rounded-2xl p-6">
                        <h4 className="font-bold text-emerald-900 dark:text-emerald-200 mb-4 flex items-center">
                          <span className="text-xl mr-2">💳</span>
                          Banking Information
                        </h4>

                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                Bank Name *
                              </label>
                              <input
                                type="text"
                                name="bankName"
                                required
                                value={formData.bankName}
                                onChange={handleChange}
                                className="block w-full px-4 py-3 border border-emerald-200 dark:border-emerald-600 rounded-xl bg-white/70 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                placeholder="e.g., FNB, Standard Bank"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                Account Holder *
                              </label>
                              <input
                                type="text"
                                name="accountHolder"
                                required
                                value={formData.accountHolder}
                                onChange={handleChange}
                                className="block w-full px-4 py-3 border border-emerald-200 dark:border-emerald-600 rounded-xl bg-white/70 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                placeholder="Full name on account"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                Account Number *
                              </label>
                              <input
                                type="text"
                                name="accountNumber"
                                required
                                value={formData.accountNumber}
                                onChange={handleChange}
                                className="block w-full px-4 py-3 border border-emerald-200 dark:border-emerald-600 rounded-xl bg-white/70 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                placeholder="Bank account number"
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                Branch Code
                              </label>
                              <input
                                type="text"
                                name="branchCode"
                                value={formData.branchCode}
                                onChange={handleChange}
                                className="block w-full px-4 py-3 border border-emerald-200 dark:border-emerald-600 rounded-xl bg-white/70 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                placeholder="6-digit branch code"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Custom Rates (Optional) */}
                      <div className="bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-200 dark:border-purple-700 rounded-2xl p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h4 className="font-bold text-purple-900 dark:text-purple-200 flex items-center">
                              <span className="text-xl mr-2">💰</span>
                              Custom Rates
                            </h4>
                            <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                              Optional: Request custom rates (subject to admin approval)
                            </p>
                          </div>
                          <label className="flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              name="requestCustomRates"
                              checked={formData.requestCustomRates}
                              onChange={handleChange}
                              className="w-5 h-5 rounded text-purple-600 focus:ring-2 focus:ring-purple-500"
                            />
                          </label>
                        </div>

                        {formData.requestCustomRates && (
                          <div className="space-y-4 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                  Base Rate (R)
                                </label>
                                <input
                                  type="number"
                                  name="baseRate"
                                  min="0"
                                  value={formData.baseRate}
                                  onChange={handleChange}
                                  className="block w-full px-4 py-3 border border-purple-200 dark:border-purple-600 rounded-xl bg-white/70 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                  placeholder="30"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                  Per Minute (R)
                                </label>
                                <input
                                  type="number"
                                  name="perMinuteRate"
                                  min="0"
                                  step="0.1"
                                  value={formData.perMinuteRate}
                                  onChange={handleChange}
                                  className="block w-full px-4 py-3 border border-purple-200 dark:border-purple-600 rounded-xl bg-white/70 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                  placeholder="2.5"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                                  Per Km (R)
                                </label>
                                <input
                                  type="number"
                                  name="perKmRate"
                                  min="0"
                                  step="0.1"
                                  value={formData.perKmRate}
                                  onChange={handleChange}
                                  className="block w-full px-4 py-3 border border-purple-200 dark:border-purple-600 rounded-xl bg-white/70 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                  placeholder="15"
                                />
                              </div>
                            </div>
                            <p className="text-xs text-purple-700 dark:text-purple-300">
                              Note: Custom rates require admin approval. Default rates will apply until approved.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Additional Notes */}
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Additional Notes or Comments
                        </label>
                        <textarea
                          name="documentsNotes"
                          rows={4}
                          value={formData.documentsNotes}
                          onChange={handleChange}
                          className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                          placeholder="Any additional information you'd like to share..."
                        />
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl p-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          ✅ <strong>What happens next:</strong> Your application will be reviewed by our admin team. You'll be notified via email once approved. Then you can upload required documents and start driving!
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-600 rounded-xl p-4">
                    <div className="flex items-center">
                      <svg className="h-5 w-5 text-red-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</span>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex space-x-4">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="flex-1 py-3 px-6 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                    >
                      Back
                    </button>
                  )}

                  {currentStep < 5 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform hover:-translate-y-0.5 transition-all duration-200"
                    >
                      Continue
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 transition-all duration-200"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                          Submitting...
                        </div>
                      ) : (
                        'Submit Application'
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Footer */}
            <div className="text-center mt-6">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                By applying, you agree to our Terms of Service and Driver Agreement
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
