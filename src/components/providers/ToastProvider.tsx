'use client'

import { Toaster } from 'react-hot-toast'

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      gutter={8}
      containerClassName="z-50"
      toastOptions={{
        // Default options
        duration: 4000,
        style: {
          background: '#363636',
          color: '#fff',
          borderRadius: '12px',
          padding: '16px',
          fontSize: '14px',
          fontWeight: '500',
          maxWidth: '500px'
        },
        
        // Success toast style
        success: {
          duration: 4000,
          style: {
            background: 'linear-gradient(135deg, #10b981, #059669)',
            color: '#fff'
          },
          iconTheme: {
            primary: '#fff',
            secondary: '#10b981'
          }
        },
        
        // Error toast style
        error: {
          duration: 6000,
          style: {
            background: 'linear-gradient(135deg, #ef4444, #dc2626)',
            color: '#fff'
          },
          iconTheme: {
            primary: '#fff',
            secondary: '#ef4444'
          }
        },
        
        // Loading toast style
        loading: {
          style: {
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
            color: '#fff'
          },
          iconTheme: {
            primary: '#fff',
            secondary: '#3b82f6'
          }
        }
      }}
    />
  )
}