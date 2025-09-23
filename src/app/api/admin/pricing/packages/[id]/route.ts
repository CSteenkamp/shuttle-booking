import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params
    const updates = await request.json()

    const creditPackage = await prisma.creditPackage.findUnique({
      where: { id }
    })

    if (!creditPackage) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      )
    }

    // Validate updates
    const allowedFields = ['name', 'credits', 'price', 'isPopular', 'isActive']
    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key]
        return obj
      }, {} as any)

    // Check for duplicate names if name is being updated
    if (filteredUpdates.name && filteredUpdates.name !== creditPackage.name) {
      const existingPackage = await prisma.creditPackage.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            { name: filteredUpdates.name.trim() }
          ]
        }
      })

      if (existingPackage) {
        return NextResponse.json(
          { error: 'Package with this name already exists' },
          { status: 400 }
        )
      }
    }

    // Validate numeric fields
    if (filteredUpdates.credits && filteredUpdates.credits <= 0) {
      return NextResponse.json(
        { error: 'Credits must be greater than 0' },
        { status: 400 }
      )
    }

    if (filteredUpdates.price && filteredUpdates.price <= 0) {
      return NextResponse.json(
        { error: 'Price must be greater than 0' },
        { status: 400 }
      )
    }

    // Trim string fields
    if (filteredUpdates.name) {
      filteredUpdates.name = filteredUpdates.name.trim()
    }

    const updatedPackage = await prisma.creditPackage.update({
      where: { id },
      data: filteredUpdates
    })

    return NextResponse.json(updatedPackage)
  } catch (error) {
    console.error('Error updating credit package:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = params

    const creditPackage = await prisma.creditPackage.findUnique({
      where: { id }
    })

    if (!creditPackage) {
      return NextResponse.json(
        { error: 'Package not found' },
        { status: 404 }
      )
    }

    await prisma.creditPackage.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Package deleted successfully' })
  } catch (error) {
    console.error('Error deleting credit package:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}