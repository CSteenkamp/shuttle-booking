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

    const packages = await prisma.creditPackage.findMany({
      orderBy: [
        { isPopular: 'desc' },
        { credits: 'asc' }
      ]
    })

    return NextResponse.json(packages)
  } catch (error) {
    console.error('Error fetching credit packages:', error)
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

    const { name, credits, price, isPopular, isActive } = await request.json()

    if (!name || !credits || !price || credits <= 0 || price <= 0) {
      return NextResponse.json(
        { error: 'Invalid package data provided' },
        { status: 400 }
      )
    }

    // Check for duplicate package names
    const existingPackage = await prisma.creditPackage.findFirst({
      where: { name: name.trim() }
    })

    if (existingPackage) {
      return NextResponse.json(
        { error: 'Package with this name already exists' },
        { status: 400 }
      )
    }

    const creditPackage = await prisma.creditPackage.create({
      data: {
        name: name.trim(),
        credits,
        price,
        isPopular: isPopular || false,
        isActive: isActive !== false // Default to true
      }
    })

    return NextResponse.json(creditPackage)
  } catch (error) {
    console.error('Error creating credit package:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}