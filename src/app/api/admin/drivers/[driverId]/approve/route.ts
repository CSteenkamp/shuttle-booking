import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AuditLogger } from '@/lib/audit'
import { DriverStatus } from '@prisma/client'

/**
 * POST /api/admin/drivers/[driverId]/approve
 * Approve a driver application
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { driverId: string } }
) {
  try {
    const session = await getServerSession()

    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'TOWN_ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { driverId } = params
    const data = await request.json()
    const { notes, baseRate, perMinuteRate, perKmRate } = data

    // Get driver profile
    const driver = await prisma.driverProfile.findUnique({
      where: { id: driverId },
      include: {
        user: true,
        driverAreas: {
          include: {
            area: {
              include: {
                city: true
              }
            }
          }
        }
      }
    })

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      )
    }

    if (driver.status !== DriverStatus.PENDING) {
      return NextResponse.json(
        { error: `Driver is already ${driver.status.toLowerCase()}` },
        { status: 400 }
      )
    }

    // Update driver profile
    const now = new Date()
    const updatedDriver = await prisma.driverProfile.update({
      where: { id: driverId },
      data: {
        status: DriverStatus.ACTIVE,
        approvedAt: now,
        approvedBy: session.user.id,
        isAvailable: true,
        baseRate: baseRate || null,
        perMinuteRate: perMinuteRate || null,
        perKmRate: perKmRate || null,
        ratesApprovedAt: (baseRate || perMinuteRate || perKmRate) ? now : null,
        ratesApprovedBy: (baseRate || perMinuteRate || perKmRate) ? session.user.id : null,
        notes: notes || driver.notes
      }
    })

    // Update user status
    await prisma.user.update({
      where: { id: driver.userId },
      data: {
        status: 'ACTIVE'
      }
    })

    // Log the approval
    await AuditLogger.logAction(
      session.user.id,
      'APPROVE',
      'driver_profile',
      driverId,
      { status: driver.status },
      { status: DriverStatus.ACTIVE, approvedAt: now },
      `Driver ${driver.user.name} approved`,
      request
    )

    // TODO: Send approval notification email to driver
    // TODO: Send welcome email with next steps (calendar setup, etc.)

    return NextResponse.json({
      success: true,
      message: `Driver ${driver.user.name} has been approved successfully`,
      driver: {
        id: updatedDriver.id,
        status: updatedDriver.status,
        approvedAt: updatedDriver.approvedAt
      }
    })

  } catch (error) {
    console.error('Error approving driver:', error)
    return NextResponse.json(
      { error: 'Failed to approve driver' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/drivers/[driverId]/approve
 * Reject a driver application
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { driverId: string } }
) {
  try {
    const session = await getServerSession()

    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'TOWN_ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { driverId } = params
    const { searchParams } = new URL(request.url)
    const reason = searchParams.get('reason') || 'Application rejected'

    // Get driver profile
    const driver = await prisma.driverProfile.findUnique({
      where: { id: driverId },
      include: {
        user: true
      }
    })

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver not found' },
        { status: 404 }
      )
    }

    // Update driver profile
    const updatedDriver = await prisma.driverProfile.update({
      where: { id: driverId },
      data: {
        status: DriverStatus.REJECTED,
        notes: reason,
        isAvailable: false
      }
    })

    // Update user status
    await prisma.user.update({
      where: { id: driver.userId },
      data: {
        status: 'SUSPENDED' // or keep as ACTIVE but with REJECTED driver status
      }
    })

    // Log the rejection
    await AuditLogger.logAction(
      session.user.id,
      'REJECT',
      'driver_profile',
      driverId,
      { status: driver.status },
      { status: DriverStatus.REJECTED, reason },
      `Driver ${driver.user.name} rejected: ${reason}`,
      request
    )

    // TODO: Send rejection notification email to driver with reason

    return NextResponse.json({
      success: true,
      message: `Driver application has been rejected`,
      driver: {
        id: updatedDriver.id,
        status: updatedDriver.status
      }
    })

  } catch (error) {
    console.error('Error rejecting driver:', error)
    return NextResponse.json(
      { error: 'Failed to reject driver' },
      { status: 500 }
    )
  }
}
