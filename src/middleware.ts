import createMiddleware from 'next-intl/middleware'
import { locales } from './i18n'

export default createMiddleware({
  // A list of all locales that are supported
  locales,
  
  // Used when no locale matches
  defaultLocale: 'en',
  
  // Show the default locale in URL (e.g., /en/about)
  localePrefix: 'always'
})

export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Enable a redirect to a matching locale at the root
    '/',
    // Set a cookie to remember the previous locale for
    // all requests that have a locale prefix
    '/(af|en)/:path*',
    // Enable redirects that add missing locales
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
}