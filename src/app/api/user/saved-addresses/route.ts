import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const savedAddresses = await prisma.savedAddress.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'asc' }
      ]
    })

    return NextResponse.json(savedAddresses)
  } catch (error) {
    console.error('Error fetching saved addresses:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { name, address, latitude, longitude, setAsDefault } = await request.json()

    if (!name || !address) {
      return NextResponse.json(
        { error: 'Name and address are required' },
        { status: 400 }
      )
    }

    // Check if user already has an address with this name
    const existingAddress = await prisma.savedAddress.findFirst({
      where: {
        userId: session.user.id,
        name: name
      }
    })

    if (existingAddress) {
      return NextResponse.json(
        { error: 'You already have an address saved with this name' },
        { status: 400 }
      )
    }

    // Create the new saved address
    const newAddress = await prisma.savedAddress.create({
      data: {
        userId: session.user.id,
        name,
        address,
        latitude,
        longitude,
        isDefault: setAsDefault || false
      }
    })

    // If this is set as default, update user's default pickup location
    if (setAsDefault) {
      // First, unset any existing default addresses
      await prisma.savedAddress.updateMany({
        where: {
          userId: session.user.id,
          id: { not: newAddress.id }
        },
        data: {
          isDefault: false
        }
      })

      // Update user's default pickup location
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          defaultPickupLocationId: newAddress.id
        }
      })
    }

    return NextResponse.json(newAddress)
  } catch (error) {
    console.error('Error creating saved address:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}