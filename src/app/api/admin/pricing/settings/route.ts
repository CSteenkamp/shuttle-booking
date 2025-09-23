import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get current pricing settings
    const settings = await prisma.settings.findMany({
      where: {
        key: {
          in: ['creditValue', 'baseTripCost']
        }
      }
    })

    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json({
      creditValue: parseFloat(settingsMap.creditValue || '25'),
      baseTripCost: parseInt(settingsMap.baseTripCost || '1')
    })
  } catch (error) {
    console.error('Error fetching pricing settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { creditValue, baseTripCost } = await request.json()

    if (!creditValue || !baseTripCost || creditValue <= 0 || baseTripCost <= 0) {
      return NextResponse.json(
        { error: 'Invalid values provided' },
        { status: 400 }
      )
    }

    // Update or create settings
    await Promise.all([
      prisma.settings.upsert({
        where: { key: 'creditValue' },
        update: { 
          value: creditValue.toString(),
          description: 'Cost per credit in South African Rand'
        },
        create: { 
          key: 'creditValue', 
          value: creditValue.toString(),
          description: 'Cost per credit in South African Rand'
        }
      }),
      prisma.settings.upsert({
        where: { key: 'baseTripCost' },
        update: { 
          value: baseTripCost.toString(),
          description: 'Credits required per passenger per trip'
        },
        create: { 
          key: 'baseTripCost', 
          value: baseTripCost.toString(),
          description: 'Credits required per passenger per trip'
        }
      })
    ])

    return NextResponse.json({
      creditValue,
      baseTripCost,
      message: 'Settings updated successfully'
    })
  } catch (error) {
    console.error('Error updating pricing settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}