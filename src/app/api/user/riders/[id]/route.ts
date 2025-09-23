import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { name, phone, relationship, dateOfBirth, medicalInfo, emergencyContact, notes } = await request.json()
    const { id } = await params

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Check if rider belongs to user
    const existingRider = await prisma.rider.findFirst({
      where: { id, userId: session.user.id }
    })

    if (!existingRider) {
      return NextResponse.json(
        { error: 'Rider not found' },
        { status: 404 }
      )
    }

    const rider = await prisma.rider.update({
      where: { id },
      data: {
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
    console.error('Error updating rider:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Check if rider belongs to user
    const existingRider = await prisma.rider.findFirst({
      where: { id, userId: session.user.id }
    })

    if (!existingRider) {
      return NextResponse.json(
        { error: 'Rider not found' },
        { status: 404 }
      )
    }

    // Check if rider has any confirmed bookings
    const confirmedBookings = await prisma.booking.count({
      where: { 
        riderId: id,
        status: 'CONFIRMED'
      }
    })

    if (confirmedBookings > 0) {
      return NextResponse.json(
        { error: 'Cannot delete rider with active bookings' },
        { status: 400 }
      )
    }

    await prisma.rider.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting rider:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}