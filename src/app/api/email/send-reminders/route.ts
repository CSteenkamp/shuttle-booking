import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendReminderEmail } from '@/lib/email';
import { addHours, subHours, isAfter, isBefore } from 'date-fns';

export async function POST(request: NextRequest) {
  try {
    // Verify this is a server-side call (you might want to add API key authentication)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const now = new Date();
    const in24Hours = addHours(now, 24);
    const in1Hour = addHours(now, 1);
    
    // Get bookings for 24-hour reminders (trips starting between 23-25 hours from now)
    const bookingsFor24hReminder = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        trip: {
          startTime: {
            gte: addHours(now, 23),
            lte: addHours(now, 25),
          },
          status: 'SCHEDULED',
        },
        // Add a flag to track if 24h reminder was sent (you might want to add this to schema)
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

    // Get bookings for 1-hour reminders (trips starting between 0.5-1.5 hours from now)
    const bookingsFor1hReminder = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        trip: {
          startTime: {
            gte: addHours(now, 0.5),
            lte: addHours(now, 1.5),
          },
          status: 'SCHEDULED',
        },
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

    let remindersSent = 0;

    // Send 24-hour reminders
    for (const booking of bookingsFor24hReminder) {
      try {
        const emailSent = await sendReminderEmail({
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
          reminderType: '24h',
        });

        if (emailSent) {
          remindersSent++;
          console.log(`24h reminder sent for booking ${booking.id}`);
        }
      } catch (error) {
        console.error(`Failed to send 24h reminder for booking ${booking.id}:`, error);
      }
    }

    // Send 1-hour reminders
    for (const booking of bookingsFor1hReminder) {
      try {
        const emailSent = await sendReminderEmail({
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
          reminderType: '1h',
        });

        if (emailSent) {
          remindersSent++;
          console.log(`1h reminder sent for booking ${booking.id}`);
        }
      } catch (error) {
        console.error(`Failed to send 1h reminder for booking ${booking.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      remindersSent,
      bookingsChecked24h: bookingsFor24hReminder.length,
      bookingsChecked1h: bookingsFor1hReminder.length,
    });

  } catch (error) {
    console.error('Error in send-reminders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Manual trigger for testing
export async function GET(request: NextRequest) {
  try {
    // For testing purposes - you might want to remove this in production
    const now = new Date();
    
    const upcomingBookings = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        trip: {
          startTime: {
            gte: now,
            lte: addHours(now, 48),
          },
          status: 'SCHEDULED',
        },
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
      },
      orderBy: {
        trip: {
          startTime: 'asc'
        }
      }
    });

    return NextResponse.json({
      upcomingBookings: upcomingBookings.map(booking => ({
        id: booking.id,
        userEmail: booking.user.email,
        destination: booking.trip.destination.name,
        startTime: booking.trip.startTime,
        hoursUntilTrip: Math.round((booking.trip.startTime.getTime() - now.getTime()) / (1000 * 60 * 60))
      }))
    });

  } catch (error) {
    console.error('Error fetching upcoming bookings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}