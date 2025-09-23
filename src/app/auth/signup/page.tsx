'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import WheelDatePicker from '@/components/ui/WheelDatePicker'

interface Rider {
  name: string;
  phone: string;
  relationship: string;
  dateOfBirth: { day: number; month: number; year: number } | null;
  medicalInfo: string;
  emergencyContact: string;
  notes: string;
}

export default function SignUp() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [riders, setRiders] = useState<Rider[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const addRider = () => {
    if (riders.length < 8) {
      setRiders([...riders, { 
        name: '', 
        phone: '', 
        relationship: 'Child',
        dateOfBirth: null,
        medicalInfo: '',
        emergencyContact: '',
        notes: ''
      }])
    }
  }

  const removeRider = (index: number) => {
    setRiders(riders.filter((_, i) => i !== index))
  }

  const updateRider = (index: number, field: keyof Rider, value: string | { day: number; month: number; year: number } | null) => {
    const updatedRiders = [...riders]
    updatedRiders[index] = { ...updatedRiders[index], [field]: value }
    setRiders(updatedRiders)
  }

  const nextStep = () => {
    if (currentStep === 1) {
      // Validate step 1
      if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
        setError('Please fill in all required fields')
        return
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match')
        return
      }
      setError('')
      setCurrentStep(2)
    }
  }

  const prevStep = () => {
    setCurrentStep(1)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          password: formData.password,
          riders: riders.filter(rider => rider.name.trim() !== ''),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.requiresVerification) {
          router.push('/auth/signin?message=Account created successfully! Please check your email to verify your account before signing in.')
        } else {
          router.push('/auth/signin?message=Account created successfully')
        }
      } else {
        setError(data.error || 'An error occurred during registration')
      }
    } catch {
      setError('An error occurred during registration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-indigo-900 transition-colors duration-300">
      {/* Theme Toggle */}
      <div className="absolute top-6 right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left Side - Branding */}
        <div className="lg:w-2/5 flex items-center justify-center p-8 lg:p-12">
          <div className="max-w-md text-center lg:text-left">
            {/* Logo */}
            <div className="flex items-center justify-center lg:justify-start space-x-3 mb-8">
              <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">🚐</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  ShuttlePro
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">Premium Shuttle Service</p>
              </div>
            </div>

            {/* Welcome Message */}
            <div className="space-y-4">
              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                Join Our
                <br />
                <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Community
                </span>
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed">
                Create your ShuttlePro account and start enjoying premium shuttle services for you and your family.
              </p>
              
              {/* Benefits */}
              <div className="space-y-3 pt-6">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-emerald-600 dark:text-emerald-400 text-sm">⭐</span>
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">Premium Service Quality</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 text-sm">👨‍👩‍👧‍👦</span>
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">Family Account Management</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                    <span className="text-purple-600 dark:text-purple-400 text-sm">💳</span>
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">Simple Credit System</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Signup Form */}
        <div className="lg:w-3/5 flex items-center justify-center p-8 lg:p-12">
          <div className="w-full max-w-2xl">
            {/* Progress Indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-center space-x-4">
                <div className={`flex items-center space-x-2 ${currentStep === 1 ? 'text-indigo-600' : currentStep > 1 ? 'text-emerald-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    currentStep === 1 ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 
                    currentStep > 1 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' : 
                    'bg-gray-100 dark:bg-gray-700 text-gray-400'
                  }`}>
                    {currentStep > 1 ? '✓' : '1'}
                  </div>
                  <span className="text-sm font-medium">Account Details</span>
                </div>
                <div className={`w-12 h-1 rounded-full ${currentStep > 1 ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                <div className={`flex items-center space-x-2 ${currentStep === 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    currentStep === 2 ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 
                    'bg-gray-100 dark:bg-gray-700 text-gray-400'
                  }`}>
                    2
                  </div>
                  <span className="text-sm font-medium">Family Setup</span>
                </div>
              </div>
            </div>

            {/* Form Card */}
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-8">
              {currentStep === 1 ? (
                <>
                  {/* Step 1: Account Details */}
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Create Your Account
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Let&apos;s start with your basic information
                    </p>
                  </div>

                  <form className="space-y-6">
                    {/* Name Field */}
                    <div>
                      <label htmlFor="name" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        Full Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <input
                          id="name"
                          name="name"
                          type="text"
                          required
                          className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                          placeholder="Enter your full name"
                          value={formData.name}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    {/* Email Field */}
                    <div>
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                        </div>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                          placeholder="Enter your email address"
                          value={formData.email}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    {/* Phone Field */}
                    <div>
                      <label htmlFor="phone" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </div>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                          placeholder="Enter your phone number"
                          value={formData.phone}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    {/* Password Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="password" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="new-password"
                            required
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                            placeholder="Create password"
                            value={formData.password}
                            onChange={handleChange}
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                          Confirm Password
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <input
                            id="confirmPassword"
                            name="confirmPassword"
                            type="password"
                            autoComplete="new-password"
                            required
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all duration-200"
                            placeholder="Confirm password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-600 rounded-xl p-4">
                        <div className="flex items-center">
                          <svg className="h-5 w-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</span>
                        </div>
                      </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex space-x-4">
                      <Link
                        href="/auth/signin"
                        className="flex-1 py-3 px-6 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200 text-center"
                      >
                        Back to Sign In
                      </Link>
                      <button
                        type="button"
                        onClick={nextStep}
                        className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transform hover:-translate-y-0.5 transition-all duration-200"
                      >
                        Continue
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <>
                  {/* Step 2: Family Setup */}
                  <div className="text-center mb-8">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Family Setup
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Add family members who will use your account (optional)
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Rider Management */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 border-2 border-blue-200 dark:border-blue-600 rounded-2xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-3">
                            <span className="text-white text-sm font-bold">👥</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-blue-900 dark:text-blue-200">Family Members</h4>
                            <p className="text-xs text-blue-700 dark:text-blue-300">Add up to 8 family members</p>
                          </div>
                        </div>
                        <span className="text-sm text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-800/50 px-3 py-1 rounded-full font-medium">
                          {riders.length}/8 riders
                        </span>
                      </div>
                      
                      {riders.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-800/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <span className="text-3xl">👨‍👩‍👧‍👦</span>
                          </div>
                          <p className="text-blue-800 dark:text-blue-200 font-medium mb-2">No family members added yet</p>
                          <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
                            Skip this step and add them later, or add them now for easier booking
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4 mb-6">
                          {riders.map((rider, index) => (
                            <div key={index} className="bg-white/80 dark:bg-gray-700/50 border border-blue-200 dark:border-blue-600 rounded-xl p-4">
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-bold text-blue-800 dark:text-blue-200">Rider {index + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => removeRider(index)}
                                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded-lg transition-colors"
                                >
                                  Remove
                                </button>
                              </div>
                              
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <input
                                    type="text"
                                    placeholder="Full name (e.g., Sarah Johnson)"
                                    value={rider.name}
                                    onChange={(e) => updateRider(index, 'name', e.target.value)}
                                    className="w-full border border-blue-200 dark:border-blue-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/70 dark:bg-gray-600/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                  />
                                  <select
                                    value={rider.relationship}
                                    onChange={(e) => updateRider(index, 'relationship', e.target.value)}
                                    className="w-full border border-blue-200 dark:border-blue-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/70 dark:bg-gray-600/50 text-gray-900 dark:text-white"
                                  >
                                    <option value="Child">Child</option>
                                    <option value="Spouse">Spouse</option>
                                    <option value="Dependent">Dependent</option>
                                    <option value="Other">Other</option>
                                  </select>
                                </div>
                                
                                <input
                                  type="tel"
                                  placeholder="Phone number (optional)"
                                  value={rider.phone}
                                  onChange={(e) => updateRider(index, 'phone', e.target.value)}
                                  className="w-full border border-blue-200 dark:border-blue-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/70 dark:bg-gray-600/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                />
                                
                                <div>
                                  <label className="block text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">Date of Birth</label>
                                  <WheelDatePicker
                                    value={rider.dateOfBirth}
                                    onChange={(date) => updateRider(index, 'dateOfBirth', date)}
                                    minYear={1950}
                                    maxYear={new Date().getFullYear()}
                                  />
                                </div>
                                
                                <div className="border-t border-blue-200 dark:border-blue-600 pt-4">
                                  <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-3">Medical Information (Optional)</h5>
                                  <div className="space-y-3">
                                    <textarea
                                      placeholder="Medical conditions, allergies, medications..."
                                      value={rider.medicalInfo}
                                      onChange={(e) => updateRider(index, 'medicalInfo', e.target.value)}
                                      rows={2}
                                      className="w-full border border-blue-200 dark:border-blue-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/70 dark:bg-gray-600/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                    />
                                    <input
                                      type="text"
                                      placeholder="Emergency contact (e.g., Mom - Jane: 082 123 4567)"
                                      value={rider.emergencyContact}
                                      onChange={(e) => updateRider(index, 'emergencyContact', e.target.value)}
                                      className="w-full border border-blue-200 dark:border-blue-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/70 dark:bg-gray-600/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                    />
                                    <textarea
                                      placeholder="Additional notes for drivers..."
                                      value={rider.notes}
                                      onChange={(e) => updateRider(index, 'notes', e.target.value)}
                                      rows={2}
                                      className="w-full border border-blue-200 dark:border-blue-600 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white/70 dark:bg-gray-600/50 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {riders.length < 8 && (
                        <button
                          type="button"
                          onClick={addRider}
                          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-3 px-4 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 font-semibold flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span>Add Family Member</span>
                        </button>
                      )}
                      
                      <div className="mt-4 p-4 bg-blue-100/50 dark:bg-blue-800/30 rounded-xl">
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          💡 <strong>Tip:</strong> You can always add or edit family members later in your profile settings.
                        </p>
                      </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-600 rounded-xl p-4">
                        <div className="flex items-center">
                          <svg className="h-5 w-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-red-700 dark:text-red-300 text-sm font-medium">{error}</span>
                        </div>
                      </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex space-x-4">
                      <button
                        type="button"
                        onClick={prevStep}
                        className="flex-1 py-3 px-6 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 px-6 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 transition-all duration-200"
                      >
                        {loading ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                            Creating Account...
                          </div>
                        ) : (
                          'Create Account'
                        )}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="text-center mt-6">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}