import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { AuditLogger } from '@/lib/audit'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { userId } = params
    const { role } = await request.json()

    if (!role || !['ADMIN', 'CUSTOMER'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { userId } = params

    // Prevent self-deletion
    if (userId === session.user.id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Check if user exists and get user details for audit log
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        bookings: { select: { id: true } },
        creditBalance: true,
        riders: { select: { id: true } },
        savedAddresses: { select: { id: true } }
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user has active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        userId: userId,
        status: 'CONFIRMED',
        trip: {
          startTime: {
            gte: new Date()
          }
        }
      }
    })

    if (activeBookings > 0) {
      return NextResponse.json(
        { error: `Cannot delete user with ${activeBookings} active future booking(s). Please cancel or complete bookings first.` },
        { status: 400 }
      )
    }

    // Log the deletion attempt for audit
    await AuditLogger.logUserAction(
      session.user.id,
      'DELETE',
      userId,
      {
        email: user.email,
        name: user.name,
        role: user.role,
        bookingsCount: user.bookings.length,
        ridersCount: user.riders.length,
        savedAddressesCount: user.savedAddresses.length,
        creditBalance: user.creditBalance?.credits || 0
      },
      undefined,
      request
    )

    // Delete user (this will cascade delete related records due to schema constraints)
    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({ 
      message: `User account for ${user.email} deleted successfully`,
      deletedUser: {
        email: user.email,
        name: user.name,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}