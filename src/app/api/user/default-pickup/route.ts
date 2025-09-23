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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        defaultPickupLocation: true
      }
    })

    return NextResponse.json({
      defaultPickupLocation: user?.defaultPickupLocation || null
    })
  } catch (error) {
    console.error('Error fetching default pickup location:', error)
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

    const { savedAddressId } = await request.json()

    if (savedAddressId) {
      // Verify the address belongs to the user
      const savedAddress = await prisma.savedAddress.findFirst({
        where: {
          id: savedAddressId,
          userId: session.user.id
        }
      })

      if (!savedAddress) {
        return NextResponse.json(
          { error: 'Saved address not found' },
          { status: 404 }
        )
      }

      // Unset other default addresses
      await prisma.savedAddress.updateMany({
        where: {
          userId: session.user.id,
          id: { not: savedAddressId }
        },
        data: {
          isDefault: false
        }
      })

      // Set this address as default
      await prisma.savedAddress.update({
        where: { id: savedAddressId },
        data: { isDefault: true }
      })
    }

    // Update user's default pickup location
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        defaultPickupLocationId: savedAddressId || null
      }
    })

    const updatedUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        defaultPickupLocation: true
      }
    })

    return NextResponse.json({
      defaultPickupLocation: updatedUser?.defaultPickupLocation || null
    })
  } catch (error) {
    console.error('Error setting default pickup location:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}