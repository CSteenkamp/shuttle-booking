import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { CityStatus, AreaStatus } from '@prisma/client'

/**
 * GET /api/cities
 * Public endpoint: List active cities with their areas for booking flow
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const includeAreas = searchParams.get('includeAreas') !== 'false' // default true
    const cityId = searchParams.get('cityId')

    // Build where clause
    const whereClause: any = {
      status: CityStatus.ACTIVE
    }

    if (cityId) {
      whereClause.id = cityId
    }

    // Fetch active cities
    const cities = await prisma.city.findMany({
      where: whereClause,
      include: {
        areas: includeAreas ? {
          where: {
            status: AreaStatus.ACTIVE
          },
          include: {
            _count: {
              select: {
                driverAreas: true // Number of drivers in this area
              }
            }
          },
          orderBy: {
            name: 'asc'
          }
        } : false,
        _count: {
          select: {
            areas: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Format response for public consumption
    const formattedCities = cities.map(city => ({
      id: city.id,
      name: city.name,
      timezone: city.timezone,
      country: city.country,
      province: city.province,
      description: city.description,
      operatingHours: city.operatingHours,
      areasCount: city._count.areas,
      ...(includeAreas && {
        areas: city.areas.map((area: any) => ({
          id: area.id,
          name: area.name,
          description: area.description,
          driversAvailable: area._count.driverAreas > 0,
          driversCount: area._count.driverAreas
        }))
      })
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
