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

    const location = await prisma.location.findUnique({
      where: { id },
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

    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      )
    }

    // Check if location is being used
    const totalUsage = location._count.trips + location._count.pickupBookings + location._count.dropoffBookings
    if (totalUsage > 0) {
      return NextResponse.json(
        { error: 'Cannot delete location that is being used in trips or bookings' },
        { status: 400 }
      )
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