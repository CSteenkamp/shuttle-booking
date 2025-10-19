import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { AuditLogger } from '@/lib/audit'
import { CityStatus } from '@prisma/client'

/**
 * GET /api/admin/cities
 * List all cities
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
    const status = searchParams.get('status') as CityStatus | null
    const includeStats = searchParams.get('includeStats') === 'true'

    const whereClause: any = {}
    if (status) {
      whereClause.status = status
    }

    const cities = await prisma.city.findMany({
      where: whereClause,
      include: {
        areas: {
          include: {
            _count: {
              select: {
                driverAreas: true,
                locations: true,
                trips: true
              }
            }
          }
        },
        _count: {
          select: {
            areas: true,
            locations: true,
            trips: true,
            townAdmins: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Format response
    const formattedCities = cities.map(city => ({
      id: city.id,
      name: city.name,
      timezone: city.timezone,
      status: city.status,
      country: city.country,
      province: city.province,
      description: city.description,
      operatingHours: city.operatingHours,
      settings: city.settings,
      createdAt: city.createdAt,
      updatedAt: city.updatedAt,
      stats: {
        areasCount: city._count.areas,
        locationsCount: city._count.locations,
        tripsCount: city._count.trips,
        adminCount: city._count.townAdmins
      },
      areas: city.areas.map(area => ({
        id: area.id,
        name: area.name,
        status: area.status,
        driversCount: area._count.driverAreas
      }))
    }))

    return NextResponse.json({
      cities: formattedCities,
      total: formattedCities.length
    })

  } catch (error) {
    console.error('Error fetching cities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cities' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/cities
 * Create a new city
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const data = await request.json()
    const {
      name,
      timezone,
      country,
      province,
      description,
      operatingHours,
      settings
    } = data

    // Validate required fields
    if (!name || !timezone) {
      return NextResponse.json(
        { error: 'Name and timezone are required' },
        { status: 400 }
      )
    }

    // Check if city already exists
    const existingCity = await prisma.city.findUnique({
      where: { name }
    })

    if (existingCity) {
      return NextResponse.json(
        { error: 'A city with this name already exists' },
        { status: 400 }
      )
    }

    // Create city
    const city = await prisma.city.create({
      data: {
        name,
        timezone,
        country: country || 'South Africa',
        province,
        description,
        status: CityStatus.ACTIVE,
        operatingHours: operatingHours || {
          monday: { start: '06:00', end: '22:00' },
          tuesday: { start: '06:00', end: '22:00' },
          wednesday: { start: '06:00', end: '22:00' },
          thursday: { start: '06:00', end: '22:00' },
          friday: { start: '06:00', end: '22:00' },
          saturday: { start: '07:00', end: '20:00' },
          sunday: { start: '08:00', end: '18:00' }
        },
        settings: settings || {
          defaultPricing: 30,
          maxTripsPerDay: 50,
          advanceBookingDays: 14
        }
      }
    })

    // Log the creation
    await AuditLogger.logAction(
      session.user.id,
      'CREATE',
      'city',
      city.id,
      undefined,
      { name, timezone, country, province },
      `Created city: ${name}`,
      request
    )

    return NextResponse.json({
      success: true,
      message: `City ${name} created successfully`,
      city
    })

  } catch (error) {
    console.error('Error creating city:', error)
    return NextResponse.json(
      { error: 'Failed to create city' },
      { status: 500 }
    )
  }
}
