import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
;
import { prisma } from '@/lib/prisma';
import { syncTripToCalendar } from '@/lib/calendar-auto-sync';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Missing booking ID' },
        { status: 400 }
      );
    }

    // Get booking details
    const booking = await prisma.booking.findUnique({
      where: { 
        id: bookingId,
        userId: session.user.id // Ensure user owns this booking
      },
      include: {
        trip: {
          include: {
            destination: true,
          }
        },
        pickupLocation: true,
        pickupSavedAddress: true,
        dropoffLocation: true,
        user: true,
      }
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Use trip-level sync to create the calendar event
    const result = await syncTripToCalendar(booking.tripId);

    if (result.success) {
      return NextResponse.json({ 
        success: true, 
        eventId: result.eventId || `sync-${booking.tripId}`,
        provider: result.provider,
        message: `Calendar event created successfully using ${result.provider}`
      });
    } else {
      return NextResponse.json(
        { error: result.error || 'Failed to create trip calendar event' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error creating calendar event:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}