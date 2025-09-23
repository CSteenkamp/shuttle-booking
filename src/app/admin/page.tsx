'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'

export default function AdminPage() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      redirect('/auth/signin')
    } else {
      // Redirect to the new dashboard
      redirect('/admin/dashboard')
    }
  }, [session, status])

  if (status === 'loading') {
    return <div className="p-8">Loading...</div>
  }

  return null
}