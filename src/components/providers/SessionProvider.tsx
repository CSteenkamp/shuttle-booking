'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'

export function SessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <NextAuthSessionProvider 
      refetchInterval={5}
      refetchOnWindowFocus={true}
      refetchWhenOffline={false}
    >
      {children}
    </NextAuthSessionProvider>
  )
}