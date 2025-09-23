import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { getDayAvailability, checkTimeSlotAvailability } from '@/lib/availability-checker'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const dateParam = searchParams.get('date')
    const startTimeParam = searchParams.get('startTime')
    const endTimeParam = searchParams.get('endTime')
    const intervalParam = searchParams.get('interval')

    if (!dateParam) {
      return NextResponse.json(
        { error: 'Date parameter is required' },
        { status: 400 }
      )
    }

    const date = new Date(dateParam)
    if (isNaN(date.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    // Check specific time slot if provided
    if (startTimeParam && endTimeParam) {
      const startTime = new Date(startTimeParam)
      const endTime = new Date(endTimeParam)
      
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return NextResponse.json(
          { error: 'Invalid time format' },
          { status: 400 }
        )
      }

      const available = await checkTimeSlotAvailability(startTime, endTime)
      
      return NextResponse.json({
        available,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      })
    }

    // Check full day availability
    const intervalMinutes = intervalParam ? parseInt(intervalParam) : 20
    const availability = await getDayAvailability(date, intervalMinutes)

    return NextResponse.json({
      date: availability.date.toISOString(),
      totalSlots: availability.totalSlots,
      availableSlots: availability.availableSlots,
      availabilityRate: availability.totalSlots > 0 
        ? (availability.availableSlots / availability.totalSlots * 100).toFixed(1)
        : '0.0',
      slots: availability.slots.map(slot => ({
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
        available: slot.available,
        reason: slot.reason
      }))
    })

  } catch (error) {
    console.error('Error checking availability:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
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

    const { startDate, endDate, intervalMinutes = 20 } = await request.json()

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }

    const start = new Date(startDate)
    const end = new Date(endDate)
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      )
    }

    if (start > end) {
      return NextResponse.json(
        { error: 'Start date must be before end date' },
        { status: 400 }
      )
    }

    // Check multiple days
    const { getAvailabilityChecker } = await import('@/lib/availability-checker')
    const checker = await getAvailabilityChecker()
    const availability = await checker.checkMultipleDaysAvailability(start, end, intervalMinutes)

    return NextResponse.json({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      intervalMinutes,
      days: availability.map(day => ({
        date: day.date.toISOString(),
        totalSlots: day.totalSlots,
        availableSlots: day.availableSlots,
        availabilityRate: day.totalSlots > 0 
          ? (day.availableSlots / day.totalSlots * 100).toFixed(1)
          : '0.0',
        slots: day.slots.map(slot => ({
          startTime: slot.startTime.toISOString(),
          endTime: slot.endTime.toISOString(),
          available: slot.available,
          reason: slot.reason
        }))
      }))
    })

  } catch (error) {
    console.error('Error checking multi-day availability:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}