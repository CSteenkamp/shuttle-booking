import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params
    const updates = await request.json()

    const location = await prisma.location.findUnique({
      where: { id }
    })

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Validate updates
    const allowedFields = ['name', 'address', 'category', 'isFrequent', 'status']
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key]
        return obj
      }, {} as any)

    // If updating name or address, check for duplicates
    if (filteredUpdates.name || filteredUpdates.address) {
      const existingLocation = await prisma.location.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(filteredUpdates.name ? [{ name: filteredUpdates.name.trim() }] : []),
                ...(filteredUpdates.address ? [{ address: filteredUpdates.address.trim() }] : [])
              ]
            }
          ]
        }
      })

      if (existingLocation) {
        return NextResponse.json(
          { error: 'Location with this name or address already exists' },
          { status: 400 }
        )
      }
    }

    // Trim string fields
    if (filteredUpdates.name) {
      filteredUpdates.name = filteredUpdates.name.trim()
    }
    if (filteredUpdates.address) {
      filteredUpdates.address = filteredUpdates.address.trim()
    }

    const updatedLocation = await prisma.location.update({
      where: { id },
      data: filteredUpdates,
      include: {
        _count: {
          select: {
            trips: true,
            pickupBookings: true,
            dropoffBookings: true
          }
        }
      }
    })

    return NextResponse.json(updatedLocation)
  } catch (error) {
    console.error('Error updating location:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    const location = await prisma.location.findUnique({
      where: { id },
      include: {
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

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Check if location is being used
    const totalUsage = location._count.trips + location._count.pickupBookings + location._count.dropoffBookings + location._count.pricingTiers
    if (totalUsage > 0 && !force) {
      const usageDetails = [];
      if (location._count.trips > 0) usageDetails.push(`${location._count.trips} trip(s)`);
      if (location._count.pickupBookings > 0) usageDetails.push(`${location._count.pickupBookings} pickup booking(s)`);
      if (location._count.dropoffBookings > 0) usageDetails.push(`${location._count.dropoffBookings} dropoff booking(s)`);
      if (location._count.pricingTiers > 0) usageDetails.push(`${location._count.pricingTiers} pricing tier(s)`);
      
      return NextResponse.json(
        { 
          error: `Cannot delete location that is being used in ${usageDetails.join(', ')}`,
          canForceDelete: location._count.trips === 0 && location._count.pickupBookings === 0 && location._count.dropoffBookings === 0,
          usageCount: {
            trips: location._count.trips,
            pickupBookings: location._count.pickupBookings,
            dropoffBookings: location._count.dropoffBookings,
            pricingTiers: location._count.pricingTiers
          }
        },
        { status: 400 }
      )
    }

    // If force delete and only pricing tiers are blocking, delete them first
    if (force && location._count.pricingTiers > 0) {
      // Only allow force delete if no active bookings or trips
      if (location._count.trips > 0 || location._count.pickupBookings > 0 || location._count.dropoffBookings > 0) {
        return NextResponse.json(
          { error: 'Cannot force delete location with active trips or bookings. Only pricing tiers can be force deleted.' },
          { status: 400 }
        )
      }
      
      // Delete pricing tiers first
      await prisma.pricingTier.deleteMany({
        where: { locationId: id }
      })
    }

    await prisma.location.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Location deleted successfully' })
  } catch (error) {
    console.error('Error deleting location:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}