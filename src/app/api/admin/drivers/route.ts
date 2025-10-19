import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DriverStatus } from '@prisma/client'

/**
 * GET /api/admin/drivers
 * List all drivers with filters
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'TOWN_ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as DriverStatus | null
    const cityId = searchParams.get('cityId')
    const areaId = searchParams.get('areaId')
    const search = searchParams.get('search')

    // Build where clause
    const whereClause: any = {}

    if (status) {
      whereClause.status = status
    }

    if (search) {
      whereClause.OR = [
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { vehiclePlate: { contains: search, mode: 'insensitive' } },
        { vehicleMake: { contains: search, mode: 'insensitive' } }
      ]
    }

    if (areaId) {
      whereClause.driverAreas = {
        some: {
          areaId
        }
      }
    } else if (cityId) {
      whereClause.driverAreas = {
        some: {
          area: {
            cityId
          }
        }
      }
    }

    // Fetch drivers
    const drivers = await prisma.driverProfile.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            status: true,
            createdAt: true
          }
        },
        driverAreas: {
          include: {
            area: {
              include: {
                city: true
              }
            }
          }
        },
        _count: {
          select: {
            tripAssignments: true,
            earnings: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Format response
    const formattedDrivers = drivers.map(driver => ({
      id: driver.id,
      userId: driver.userId,
      status: driver.status,
      user: {
        name: driver.user.name,
        email: driver.user.email,
        phone: driver.user.phone,
        status: driver.user.status
      },
      vehicle: {
        make: driver.vehicleMake,
        model: driver.vehicleModel,
        year: driver.vehicleYear,
        color: driver.vehicleColor,
        plate: driver.vehiclePlate,
        capacity: driver.vehicleCapacity
      },
      license: {
        number: driver.licenseNumber,
        expiry: driver.licenseExpiry
      },
      documents: {
        license: driver.licenseDocUrl,
        id: driver.idDocumentUrl,
        vehicleReg: driver.vehicleRegUrl,
        insurance: driver.insuranceDocUrl,
        policeCheck: driver.policeCheckUrl
      },
      areas: driver.driverAreas.map(da => ({
        id: da.area.id,
        name: da.area.name,
        cityId: da.area.cityId,
        cityName: da.area.city.name,
        isPrimary: da.isPrimary
      })),
      stats: {
        totalTrips: driver.totalTrips,
        completedTrips: driver.completedTrips,
        cancelledTrips: driver.cancelledTrips,
        averageRating: driver.averageRating,
        totalEarnings: driver.totalEarnings
      },
      availability: {
        isAvailable: driver.isAvailable,
        preferredStartTime: driver.preferredStartTime,
        preferredEndTime: driver.preferredEndTime,
        maxTripsPerDay: driver.maxTripsPerDay
      },
      rates: {
        baseRate: driver.baseRate,
        perMinuteRate: driver.perMinuteRate,
        perKmRate: driver.perKmRate,
        customRatesEnabled: driver.customRatesEnabled,
        ratesApprovedAt: driver.ratesApprovedAt
      },
      bio: driver.bio,
      emergencyContact: driver.emergencyContact,
      createdAt: driver.createdAt,
      approvedAt: driver.approvedAt,
      approvedBy: driver.approvedBy
    }))

    return NextResponse.json({
      drivers: formattedDrivers,
      total: formattedDrivers.length
    })

  } catch (error) {
    console.error('Error fetching drivers:', error)
    return NextResponse.json(
      { error: 'Failed to fetch drivers' },
      { status: 500 }
    )
  }
}
