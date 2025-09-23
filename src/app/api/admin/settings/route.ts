import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { prisma } from '@/lib/prisma'
import { AuditLogger } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const settings = await prisma.settings.findMany({
      orderBy: { key: 'asc' }
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { key, value, description } = await request.json()

    if (!key || value === undefined) {
      return NextResponse.json(
        { error: 'Key and value are required' },
        { status: 400 }
      )
    }

    // Validate specific setting types
    const validationResult = validateSetting(key, value)
    if (!validationResult.valid) {
      return NextResponse.json(
        { error: validationResult.error },
        { status: 400 }
      )
    }

    // Get the old value for audit logging
    const existingSetting = await prisma.settings.findUnique({
      where: { key }
    })

    const setting = await prisma.settings.upsert({
      where: { key },
      update: { 
        value: value.toString(),
        description: description || generateDescription(key)
      },
      create: {
        key,
        value: value.toString(),
        description: description || generateDescription(key)
      }
    })

    // Log the settings change
    if (existingSetting) {
      await AuditLogger.logSettingsChange(
        session.user.id,
        key,
        existingSetting.value,
        value.toString(),
        request
      )
    } else {
      await AuditLogger.logCreate(
        session.user.id,
        'settings',
        key,
        { [key]: value.toString() },
        request,
        `Created new setting: ${key}`
      )
    }

    return NextResponse.json(setting)
  } catch (error) {
    console.error('Error updating setting:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key')

    if (!key) {
      return NextResponse.json(
        { error: 'Setting key is required' },
        { status: 400 }
      )
    }

    // Prevent deletion of critical system settings
    const protectedKeys = [
      'creditValue',
      'baseTripCost',
      'driver_email',
      'system_name'
    ]

    if (protectedKeys.includes(key)) {
      return NextResponse.json(
        { error: 'Cannot delete protected system setting' },
        { status: 403 }
      )
    }

    await prisma.settings.delete({
      where: { key }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting setting:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Validation function for different setting types
function validateSetting(key: string, value: string): { valid: boolean; error?: string } {
  // Email validation
  if (key.includes('email') && value && !isValidEmail(value)) {
    return { valid: false, error: 'Invalid email format' }
  }

  // Numeric validation for specific keys
  const numericKeys = [
    'creditValue',
    'baseTripCost',
    'max_passengers_per_trip',
    'booking_advance_days',
    'cancellation_hours',
    'business_start_hour',
    'business_end_hour',
    'trip_duration_minutes',
    'time_slot_interval',
    'session_timeout_hours',
    'max_login_attempts',
    'lockout_duration_minutes',
    'credit_expiry_days'
  ]

  if (numericKeys.includes(key)) {
    const numValue = parseFloat(value)
    if (isNaN(numValue) || numValue < 0) {
      return { valid: false, error: 'Value must be a positive number' }
    }

    // Specific validations
    if (key === 'business_start_hour' || key === 'business_end_hour') {
      if (numValue < 0 || numValue > 23) {
        return { valid: false, error: 'Hour must be between 0 and 23' }
      }
    }

    if (key === 'max_passengers_per_trip' && numValue > 20) {
      return { valid: false, error: 'Maximum passengers cannot exceed 20' }
    }

    if (key === 'creditValue' && numValue < 1) {
      return { valid: false, error: 'Credit value must be at least R1' }
    }

    if (key === 'baseTripCost' && numValue < 1) {
      return { valid: false, error: 'Base trip cost must be at least 1 credit' }
    }
  }

  // Boolean validation
  const booleanKeys = [
    'auto_calendar_sync',
    'email_service_enabled',
    'booking_confirmation_enabled',
    'reminder_24h_enabled',
    'reminder_1h_enabled',
    'refund_enabled',
    'weekend_service_enabled',
    'require_phone_verification'
  ]

  if (booleanKeys.includes(key) && value !== 'true' && value !== 'false') {
    return { valid: false, error: 'Value must be true or false' }
  }

  return { valid: true }
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function generateDescription(key: string): string {
  const descriptions: Record<string, string> = {
    system_name: 'System name displayed throughout the application',
    company_name: 'Company name for emails and official documents',
    support_email: 'Email address for customer support and inquiries',
    driver_name: 'Primary driver name for calendar invites',
    driver_email: 'Driver email address for calendar invites',
    driver_phone: 'Driver phone number for emergency contact',
    creditValue: 'Cost per credit in South African Rand',
    baseTripCost: 'Base credits required per passenger per trip',
    max_passengers_per_trip: 'Maximum passengers allowed per trip',
    business_start_hour: 'Earliest hour for trip scheduling',
    business_end_hour: 'Latest hour for trip scheduling',
    auto_calendar_sync: 'Automatically sync bookings to driver calendar',
    email_service_enabled: 'Enable/disable email notifications system-wide'
  }

  return descriptions[key] || `Configuration setting: ${key}`
}