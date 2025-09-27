import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'

// Can be imported from a shared config
export const locales = ['en', 'af'] as const
export type Locale = (typeof locales)[number]

export default getRequestConfig(async ({ locale }) => {
  // Handle undefined locale
  const currentLocale = locale || 'en'
  
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(currentLocale as Locale)) {
    console.error(`Invalid locale: ${locale}, using default 'en'`)
    notFound()
  }

  return {
    locale: currentLocale,
    messages: (await import(`../messages/${currentLocale}.json`)).default
  }
})