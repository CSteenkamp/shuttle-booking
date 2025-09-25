import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calculateTripCost } from '@/lib/pricing'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const passengerCount = parseInt(searchParams.get('passengerCount') || '1')

    // Get the trip to find its destination
    const trip = await prisma.trip.findUnique({
      where: { id: params.id },
      include: {
        destination: true
      }
    })

    if (!trip) {
      return NextResponse.json(
        { error: 'Trip not found' },
        { status: 404 }
      )
    }

    // Calculate pricing for this destination and passenger count
    const pricing = await calculateTripCost(trip.destinationId, passengerCount)

    if (!pricing) {
      return NextResponse.json(
        { error: 'Could not calculate pricing' },
        { status: 500 }
      )
    }

    return NextResponse.json(pricing)

  } catch (error) {
    console.error('Error fetching trip pricing:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}