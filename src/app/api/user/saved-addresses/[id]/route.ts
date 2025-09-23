import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Check if the address belongs to the user
    const existingAddress = await prisma.savedAddress.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingAddress) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      )
    }

    // Check if user already has another address with this name
    const duplicateName = await prisma.savedAddress.findFirst({
      where: {
        userId: session.user.id,
        name: name,
        id: { not: params.id }
      }
    })

    if (duplicateName) {
      return NextResponse.json(
        { error: 'You already have an address saved with this name' },
        { status: 400 }
      )
    }

    // Update the address
    const updatedAddress = await prisma.savedAddress.update({
      where: { id: params.id },
      data: {
        name,
        address,
        latitude,
        longitude,
        isDefault: setAsDefault || false
      }
    })

    // Handle default address changes
    if (setAsDefault) {
      // Unset other default addresses
      await prisma.savedAddress.updateMany({
        where: {
          userId: session.user.id,
          id: { not: params.id }
        },
        data: {
          isDefault: false
        }
      })

      // Update user's default pickup location
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          defaultPickupLocationId: params.id
        }
      })
    } else if (existingAddress.isDefault) {
      // If we're unsetting the default, clear user's default pickup location
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          defaultPickupLocationId: null
        }
      })
    }

    return NextResponse.json(updatedAddress)
  } catch (error) {
    console.error('Error updating saved address:', error)
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
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if the address belongs to the user
    const existingAddress = await prisma.savedAddress.findFirst({
      where: {
        id: params.id,
        userId: session.user.id
      }
    })

    if (!existingAddress) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      )
    }

    // If this is the default address, clear user's default pickup location
    if (existingAddress.isDefault) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          defaultPickupLocationId: null
        }
      })
    }

    // Delete the address
    await prisma.savedAddress.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting saved address:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}