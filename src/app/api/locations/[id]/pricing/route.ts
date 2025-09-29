import { NextRequest, NextResponse } from 'next/server'
import { getPricingDisplay } from '@/lib/pricing'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const pricing = await getPricingDisplay(id)

    if (!pricing) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(pricing)

  } catch (error) {
    console.error('Error fetching location pricing:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}