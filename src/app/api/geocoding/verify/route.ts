/**
 * Address Verification API
 * POST /api/geocoding/verify
 * Verifies and geocodes an address
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { verifyAddress } from '@/lib/geocoding'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { address, countryBias } = body

    if (!address || typeof address !== 'string') {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      )
    }

    // Verify the address
    const result = await verifyAddress(address, countryBias || 'ZA')

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Failed to verify address'
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      address: result.address,
      suggestions: result.suggestions || []
    })
  } catch (error) {
    console.error('Error verifying address:', error)
    return NextResponse.json(
      { error: 'Failed to verify address' },
      { status: 500 }
    )
  }
}
