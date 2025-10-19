import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { verifyAddress } from '@/lib/geocoding'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const locations = await prisma.location.findMany({
      include: {
        _count: {
          select: {
            trips: true,
            pickupBookings: true,
            dropoffBookings: true,
            pricingTiers: true
          }
        }
      },
      orderBy: [
        { isFrequent: 'desc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json(locations)
  } catch (error) {
    console.error('Error fetching locations:', error)
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

    const {
      name,
      address,
      category,
      isFrequent,
      cityId,
      areaId,
      defaultDuration,
      baseCost,
      skipVerification
    } = await request.json()

    if (!name || !address) {
      return NextResponse.json(
        { error: 'Name and address are required' },
        { status: 400 }
      )
    }

    // Check for duplicate locations
    const existingLocation = await prisma.location.findFirst({
      where: {
        OR: [
          { name: name.trim() },
          { address: address.trim() }
        ]
      }
    })

    if (existingLocation) {
      return NextResponse.json(
        { error: 'Location with this name or address already exists' },
        { status: 400 }
      )
    }

    // Automatic address verification
    let latitude: number | undefined
    let longitude: number | undefined
    let verifiedAddress = address.trim()
    let verificationWarning: string | undefined

    if (!skipVerification) {
      console.log(`🔍 Verifying address: ${address}`)
      const verification = await verifyAddress(address, 'ZA')

      if (verification.success && verification.address) {
        latitude = verification.address.latitude
        longitude = verification.address.longitude
        verifiedAddress = verification.address.formattedAddress
        console.log(`✅ Address verified: ${verifiedAddress} (${latitude}, ${longitude})`)
      } else {
        verificationWarning = verification.error || 'Address could not be verified automatically'
        console.warn(`⚠️ Address verification failed: ${verificationWarning}`)
      }
    }

    const location = await prisma.location.create({
      data: {
        name: name.trim(),
        address: verifiedAddress,
        latitude,
        longitude,
        category: category || 'other',
        isFrequent: isFrequent || false,
        cityId: cityId || null,
        areaId: areaId || null,
        defaultDuration: defaultDuration || null,
        baseCost: baseCost || null,
        status: 'APPROVED' // Admin created locations are auto-approved
      },
      include: {
        city: true,
        area: true,
        _count: {
          select: {
            trips: true,
            pickupBookings: true,
            dropoffBookings: true,
            pricingTiers: true
          }
        }
      }
    })

    return NextResponse.json({
      ...location,
      verificationWarning
    })
  } catch (error) {
    console.error('Error creating location:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}