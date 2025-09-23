import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const riders = await prisma.rider.findMany({
      where: { userId: session.user.id },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(riders)
  } catch (error) {
    console.error('Error fetching riders:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { name, phone, relationship, dateOfBirth, medicalInfo, emergencyContact, notes } = await request.json()


    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Verify user exists
    console.log('Looking for user with ID:', session.user.id)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })
    console.log('Found user:', user ? 'Yes' : 'No')

    if (!user) {
      // Let's check what users exist in the database
      const allUsers = await prisma.user.findMany({
        select: { id: true, email: true, name: true }
      })
      console.log('All users in database:', allUsers)
      
      return NextResponse.json(
        { error: 'User not found', sessionUserId: session.user.id, availableUsers: allUsers.length },
        { status: 404 }
      )
    }

    // Check if user already has 8 riders
    const existingRiders = await prisma.rider.count({
      where: { userId: session.user.id }
    })

    if (existingRiders >= 8) {
      return NextResponse.json(
        { error: 'Maximum of 8 riders allowed per account' },
        { status: 400 }
      )
    }

    const rider = await prisma.rider.create({
      data: {
        userId: session.user.id,
        name: name.trim(),
        phone: phone?.trim() || null,
        relationship: relationship || 'Child',
        dateOfBirth: dateOfBirth && dateOfBirth.trim() ? new Date(dateOfBirth) : null,
        medicalInfo: medicalInfo?.trim() || null,
        emergencyContact: emergencyContact?.trim() || null,
        notes: notes?.trim() || null,
      }
    })

    return NextResponse.json(rider)
  } catch (error) {
    console.error('Error creating rider:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}