import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/auth';
;
import { prisma } from '@/lib/prisma';
import { sendBookingConfirmation } from '@/lib/email';

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
        { error: 'Booking ID is required' },
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
        user: true,
        pickupLocation: true,
          pickupSavedAddress: true,
        rider: true,
      }
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Send confirmation email
    const emailSent = await sendBookingConfirmation({
      userEmail: booking.user.email,
      userName: booking.user.name || booking.user.email.split('@')[0],
      tripDetails: {
        destination: booking.trip.destination.name,
        destinationAddress: booking.trip.destination.address,
        startTime: booking.trip.startTime,
        endTime: booking.trip.endTime,
        pickupAddress: booking.pickupLocation.address,
        passengerCount: booking.passengerCount,
        riderName: booking.rider?.name,
        riderPhone: booking.rider?.phone || undefined,
      },
      bookingId: booking.id,
    });

    if (emailSent) {
      return NextResponse.json({ 
        success: true, 
        message: 'Confirmation email sent successfully' 
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send confirmation email' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error sending confirmation email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}