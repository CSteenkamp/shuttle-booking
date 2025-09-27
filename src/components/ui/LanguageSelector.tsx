'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useLocale } from 'next-intl'
import { useState } from 'react'

export function LanguageSelector() {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale()
  const [isOpen, setIsOpen] = useState(false)

  const languages = [
    { code: 'en', name: 'EN', fullName: 'English', flag: '🇺🇸' },
    { code: 'af', name: 'AF', fullName: 'Afrikaans', flag: '🇿🇦' }
  ]

  const currentLanguage = languages.find(lang => lang.code === locale) || languages[0]

  const changeLanguage = (newLocale: string) => {
    // Remove the current locale from the pathname and add the new one
    const segments = pathname.split('/')
    segments[1] = newLocale
    const newPath = segments.join('/')
    
    router.push(newPath)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1 px-2 py-1.5 rounded-md bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200/50 dark:border-gray-600/50 shadow-sm hover:shadow-md text-xs"
        aria-label="Select language"
      >
        <span className="text-sm">{currentLanguage.flag}</span>
        <span className="font-medium text-gray-700 dark:text-gray-200 hidden sm:inline">
          {currentLanguage.name}
        </span>
        <svg
          className={`w-3 h-3 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-1 w-32 sm:w-36 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 py-1 z-20 backdrop-blur-lg">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => changeLanguage(language.code)}
                className={`w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors duration-200 text-sm ${
                  language.code === locale
                    ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                <span className="text-sm">{language.flag}</span>
                <div className="flex-1">
                  <div className="font-medium">{language.fullName}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {language.name}
                  </div>
                </div>
                {language.code === locale && (
                  <svg className="w-3 h-3 text-indigo-600 dark:text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}