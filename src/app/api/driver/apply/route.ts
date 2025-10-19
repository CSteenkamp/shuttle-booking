import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AuditLogger } from '@/lib/audit'
import bcrypt from 'bcryptjs'

/**
 * POST /api/driver/apply
 * Submit a driver application
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    const data = await request.json()

    // Extract application data
    const {
      // Personal info (if not already registered)
      email,
      password,
      name,
      phone,

      // License & Vehicle
      licenseNumber,
      licenseExpiry,
      vehicleMake,
      vehicleModel,
      vehicleYear,
      vehicleColor,
      vehiclePlate,
      vehicleCapacity,

      // Documents (URLs - would be uploaded separately)
      licenseDocUrl,
      idDocumentUrl,
      vehicleRegUrl,
      insuranceDocUrl,
      policeCheckUrl,

      // Preferences
      preferredCityId,
      preferredAreaIds, // Array of area IDs
      preferredStartTime,
      preferredEndTime,
      maxTripsPerDay,

      // Additional
      bio,
      emergencyContact
    } = data

    // Validate required fields
    if (!licenseNumber || !vehicleMake || !vehicleModel || !vehiclePlate) {
      return NextResponse.json(
        { error: 'Missing required vehicle/license information' },
        { status: 400 }
      )
    }

    if (!preferredCityId || !preferredAreaIds || preferredAreaIds.length === 0) {
      return NextResponse.json(
        { error: 'Please select a city and at least one operational area' },
        { status: 400 }
      )
    }

    let userId: string

    // Check if user is already logged in
    if (session) {
      // Existing user applying to become a driver
      userId = session.user.id

      // Check if they already have a driver profile
      const existingProfile = await prisma.driverProfile.findUnique({
        where: { userId }
      })

      if (existingProfile) {
        return NextResponse.json(
          { error: 'You have already submitted a driver application' },
          { status: 400 }
        )
      }
    } else {
      // New user registration + driver application
      if (!email || !password || !name || !phone) {
        return NextResponse.json(
          { error: 'Please provide email, password, name, and phone for registration' },
          { status: 400 }
        )
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() }
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'Email already registered. Please log in to apply as a driver.' },
          { status: 400 }
        )
      }

      // Create new user account
      const hashedPassword = await bcrypt.hash(password, 10)

      const newUser = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          name,
          phone,
          role: 'DRIVER', // Set role to DRIVER
          status: 'PENDING_APPROVAL',
          emailVerified: false
        }
      })

      userId = newUser.id

      // Create credit balance for the driver
      await prisma.creditBalance.create({
        data: {
          userId,
          credits: 0
        }
      })
    }

    // Create driver profile
    const driverProfile = await prisma.driverProfile.create({
      data: {
        userId,
        status: 'PENDING',
        licenseNumber,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
        vehicleMake,
        vehicleModel,
        vehicleYear: vehicleYear ? parseInt(vehicleYear) : null,
        vehicleColor,
        vehiclePlate,
        vehicleCapacity: vehicleCapacity ? parseInt(vehicleCapacity) : 4,
        licenseDocUrl,
        idDocumentUrl,
        vehicleRegUrl,
        insuranceDocUrl,
        policeCheckUrl,
        preferredStartTime,
        preferredEndTime,
        maxTripsPerDay: maxTripsPerDay ? parseInt(maxTripsPerDay) : 20,
        bio,
        emergencyContact,
        isAvailable: false // Will be enabled after approval
      }
    })

    // Create driver area assignments
    const areaAssignments = await Promise.all(
      preferredAreaIds.map((areaId: string, index: number) =>
        prisma.driverArea.create({
          data: {
            driverId: driverProfile.id,
            areaId,
            isPrimary: index === 0 // First area is primary
          }
        })
      )
    )

    // Update user role to DRIVER if not already set
    if (session) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          role: 'DRIVER',
          status: 'PENDING_APPROVAL'
        }
      })
    }

    // Log the application
    await AuditLogger.logAction(
      userId,
      'CREATE',
      'driver_profile',
      driverProfile.id,
      undefined,
      {
        vehiclePlate,
        preferredCity: preferredCityId,
        preferredAreas: preferredAreaIds.length
      },
      'Driver application submitted',
      request
    )

    // TODO: Send notification to admins about new driver application
    // TODO: Send confirmation email to driver

    return NextResponse.json({
      success: true,
      message: 'Driver application submitted successfully! You will be notified once your application is reviewed.',
      driverProfileId: driverProfile.id,
      userId
    })

  } catch (error) {
    console.error('Error submitting driver application:', error)
    return NextResponse.json(
      { error: 'Failed to submit application. Please try again.' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/driver/apply
 * Get application status for current user
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user has a driver profile
    const driverProfile = await prisma.driverProfile.findUnique({
      where: { userId: session.user.id },
      include: {
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

    if (!driverProfile) {
      return NextResponse.json({
        hasApplication: false,
        canApply: true
      })
    }

    return NextResponse.json({
      hasApplication: true,
      canApply: false,
      application: {
        status: driverProfile.status,
        createdAt: driverProfile.createdAt,
        approvedAt: driverProfile.approvedAt,
        vehicleInfo: {
          make: driverProfile.vehicleMake,
          model: driverProfile.vehicleModel,
          plate: driverProfile.vehiclePlate,
          capacity: driverProfile.vehicleCapacity
        },
        areas: driverProfile.driverAreas.map(da => ({
          id: da.area.id,
          name: da.area.name,
          cityName: da.area.city.name,
          isPrimary: da.isPrimary
        }))
      }
    })

  } catch (error) {
    console.error('Error fetching driver application:', error)
    return NextResponse.json(
      { error: 'Failed to fetch application status' },
      { status: 500 }
    )
  }
}
