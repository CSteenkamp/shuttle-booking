import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AuditLogger } from '@/lib/audit'
import { AreaStatus } from '@prisma/client'

/**
 * GET /api/admin/areas
 * List all areas (optionally filtered by city)
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
    const cityId = searchParams.get('cityId')
    const status = searchParams.get('status') as AreaStatus | null

    const whereClause: any = {}
    if (cityId) {
      whereClause.cityId = cityId
    }
    if (status) {
      whereClause.status = status
    }

    const areas = await prisma.area.findMany({
      where: whereClause,
      include: {
        city: {
          select: {
            id: true,
            name: true,
            timezone: true
          }
        },
        _count: {
          select: {
            driverAreas: true,
            locations: true,
            trips: true
          }
        }
      },
      orderBy: [
        { city: { name: 'asc' } },
        { name: 'asc' }
      ]
    })

    const formattedAreas = areas.map(area => ({
      id: area.id,
      name: area.name,
      description: area.description,
      status: area.status,
      cityId: area.cityId,
      cityName: area.city.name,
      boundaries: area.boundaries,
      centerLat: area.centerLat,
      centerLng: area.centerLng,
      radius: area.radius,
      createdAt: area.createdAt,
      updatedAt: area.updatedAt,
      stats: {
        driversCount: area._count.driverAreas,
        locationsCount: area._count.locations,
        tripsCount: area._count.trips
      }
    }))

    return NextResponse.json({
      areas: formattedAreas,
      total: formattedAreas.length
    })

  } catch (error) {
    console.error('Error fetching areas:', error)
    return NextResponse.json(
      { error: 'Failed to fetch areas' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/areas
 * Create a new area
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'TOWN_ADMIN')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const data = await request.json()
    const {
      cityId,
      name,
      description,
      boundaries,
      centerLat,
      centerLng,
      radius
    } = data

    // Validate required fields
    if (!cityId || !name) {
      return NextResponse.json(
        { error: 'City and name are required' },
        { status: 400 }
      )
    }

    // Verify city exists
    const city = await prisma.city.findUnique({
      where: { id: cityId }
    })

    if (!city) {
      return NextResponse.json(
        { error: 'City not found' },
        { status: 404 }
      )
    }

    // Check if area already exists in this city
    const existingArea = await prisma.area.findUnique({
      where: {
        cityId_name: {
          cityId,
          name
        }
      }
    })

    if (existingArea) {
      return NextResponse.json(
        { error: 'An area with this name already exists in this city' },
        { status: 400 }
      )
    }

    // Create area
    const area = await prisma.area.create({
      data: {
        cityId,
        name,
        description,
        status: AreaStatus.ACTIVE,
        boundaries,
        centerLat: centerLat ? parseFloat(centerLat) : null,
        centerLng: centerLng ? parseFloat(centerLng) : null,
        radius: radius ? parseFloat(radius) : null
      },
      include: {
        city: {
          select: {
            name: true
          }
        }
      }
    })

    // Log the creation
    await AuditLogger.logAction(
      session.user.id,
      'CREATE',
      'area',
      area.id,
      undefined,
      { name, cityName: area.city.name },
      `Created area: ${name} in ${area.city.name}`,
      request
    )

    return NextResponse.json({
      success: true,
      message: `Area ${name} created successfully in ${area.city.name}`,
      area
    })

  } catch (error) {
    console.error('Error creating area:', error)
    return NextResponse.json(
      { error: 'Failed to create area' },
      { status: 500 }
    )
  }
}
