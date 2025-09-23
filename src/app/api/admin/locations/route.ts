import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

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
            dropoffBookings: true
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

    const { name, address, category, isFrequent } = await request.json()

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

    const location = await prisma.location.create({
      data: {
        name: name.trim(),
        address: address.trim(),
        category: category || 'other',
        isFrequent: isFrequent || false,
        status: 'APPROVED' // Admin created locations are auto-approved
      },
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

    return NextResponse.json(location)
  } catch (error) {
    console.error('Error creating location:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}