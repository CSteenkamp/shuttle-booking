'use client'

import Link from 'next/link'
import { useSession, signIn, signOut } from 'next-auth/react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { getUserDisplayName } from '@/lib/utils'

export default function Home() {
  const { data: session, status } = useSession()


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-slate-800 dark:to-indigo-900 transition-colors duration-300">
      {/* Navigation */}
      <nav className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">🚐</span>
                </div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  ShuttlePro
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              {status === 'loading' ? (
                <div className="animate-pulse text-gray-500 dark:text-gray-400">Loading...</div>
              ) : session ? (
                <>
                  <span className="text-gray-700 dark:text-gray-200 font-medium">
                    Welcome, {getUserDisplayName(session)}
                  </span>
                  {session.user.role === 'ADMIN' && (
                    <Link
                      href="/admin"
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                    >
                      Admin Panel
                    </Link>
                  )}
                  <Link
                    href="/book"
                    className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                  >
                    Book Trip
                  </Link>
                  <Link
                    href="/profile"
                    className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors duration-200 font-medium"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors duration-200 font-medium"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => signIn()}
                    className="text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 font-medium"
                  >
                    Sign In
                  </button>
                  <Link
                    href="/auth/signup"
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl md:text-6xl mb-6">
            <span className="block">🚐 ShuttlePro</span>
            <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-teal-600 bg-clip-text text-transparent">
              Making Every Ride Easy & Safe
            </span>
          </h1>
          <p className="mt-6 max-w-3xl mx-auto text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
            Whether it's getting your kids to after-school activities or catching a lift around town, 
            ShuttlePro makes travel simple, safe, and stress-free.
          </p>
          <div className="mt-10 max-w-md mx-auto sm:flex sm:justify-center">
            {session ? (
              <Link
                href="/book"
                className="group w-full flex items-center justify-center px-8 py-4 border border-transparent text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                👉 Book Your Child's Lift Today
                <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            ) : (
              <button
                onClick={() => signIn()}
                className="group w-full flex items-center justify-center px-8 py-4 border border-transparent text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
              >
                👉 Get Started Today
                <svg className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mt-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Why Families Love ShuttlePro 💛</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Designed for peace of mind, comfort, and convenience.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="group bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50 hover:border-indigo-300/50 dark:hover:border-indigo-500/50">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl text-white mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                  ⏰
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Easy Scheduling</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Book relaxed 20-minute time slots from Monday to Friday, 7AM–6PM. We fit into your day, not the other way around.
                </p>
              </div>
            </div>

            <div className="group bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50 hover:border-emerald-300/50 dark:hover:border-emerald-500/50">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center text-3xl text-white mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                  💳
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Simple Credit System</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Load credits once and use them whenever you need a ride. 1 credit = 1 trip. No surprises, just clear and easy.
                </p>
              </div>
            </div>

            <div className="group bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 border border-gray-200/50 dark:border-gray-700/50 hover:border-blue-300/50 dark:hover:border-blue-500/50">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl text-white mb-6 mx-auto group-hover:scale-110 transition-transform duration-300">
                  🚐
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Share the Ride</h3>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  Travel together! Up to 4 passengers can hop on the same shuttle. Safer, friendlier, and better for the planet.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="mt-24">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-xl p-12 border border-gray-200/50 dark:border-gray-700/50">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">How It Works ✨</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4 mx-auto">1</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Pick Your Time</h3>
                <p className="text-gray-600 dark:text-gray-300">Choose from 7AM–6PM weekday slots that work for you.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4 mx-auto">2</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Set Locations</h3>
                <p className="text-gray-600 dark:text-gray-300">Choose your pickup & drop-off spots.</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4 mx-auto">3</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Enjoy the Ride</h3>
                <p className="text-gray-600 dark:text-gray-300">Hop in & relax while we take care of the rest.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Facts */}
        <div className="mt-24">
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-teal-600 rounded-3xl p-12 text-white shadow-2xl">
            <h2 className="text-3xl font-bold mb-8 text-center">Quick Facts 📝</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-2xl mb-2">✅</div>
                <div className="text-lg font-semibold mb-2">20-minute time slots</div>
                <div className="text-indigo-100 text-sm">flexible and convenient</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">✅</div>
                <div className="text-lg font-semibold mb-2">Weekday rides</div>
                <div className="text-indigo-100 text-sm">Monday to Friday, 7AM–6PM</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">✅</div>
                <div className="text-lg font-semibold mb-2">1 Credit = 1 Trip</div>
                <div className="text-indigo-100 text-sm">simple and transparent</div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-2">✅</div>
                <div className="text-lg font-semibold mb-2">Up to 4 passengers</div>
                <div className="text-indigo-100 text-sm">share with friends or family</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
