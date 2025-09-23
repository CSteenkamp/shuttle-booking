import { prisma } from '@/lib/prisma'
import { calculateTripCost, calculateRefundAmount } from '@/lib/pricing'

export interface RefundResult {
  success: boolean
  refundsProcessed: number
  totalRefunded: number
  errors: string[]
  refundDetails: Array<{
    bookingId: string
    userId: string
    userName: string
    originalCost: number
    newCost: number
    refundAmount: number
  }>
}

/**
 * Process retroactive refunds when a new passenger joins a trip
 */
export async function processRetroactiveRefunds(
  tripId: string,
  newBookingId: string
): Promise<RefundResult> {
  console.log(`[REFUNDS] Processing retroactive refunds for trip ${tripId}, new booking ${newBookingId}`)
  
  const result: RefundResult = {
    success: false,
    refundsProcessed: 0,
    totalRefunded: 0,
    errors: [],
    refundDetails: []
  }

  try {
    // Get trip details with all confirmed bookings
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        destination: true,
        bookings: {
          where: { status: 'CONFIRMED' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!trip) {
      result.errors.push('Trip not found')
      return result
    }

    const currentPassengerCount = trip.bookings.reduce(
      (sum, booking) => sum + booking.passengerCount, 
      0
    )

    console.log(`[REFUNDS] Trip has ${trip.bookings.length} bookings, ${currentPassengerCount} total passengers`)

    // Calculate the new cost per person with current passenger count
    const newPricing = await calculateTripCost(trip.destinationId, currentPassengerCount)
    
    if (!newPricing) {
      result.errors.push('Could not calculate new pricing')
      return result
    }

    console.log(`[REFUNDS] New pricing: R${newPricing.costPerPerson} per person`)

    // Process refunds for existing bookings (exclude the new booking)
    const existingBookings = trip.bookings.filter(booking => booking.id !== newBookingId)
    
    await prisma.$transaction(async (tx) => {
      for (const booking of existingBookings) {
        const originalCost = booking.originalCost || booking.creditsCost
        const newCost = newPricing.costPerPerson
        const refundAmount = originalCost - newCost

        if (refundAmount > 0) {
          console.log(`[REFUNDS] Processing refund for booking ${booking.id}: R${originalCost} -> R${newCost} (R${refundAmount} refund)`)

          // Update the booking with new cost and store original cost if not already set
          await tx.booking.update({
            where: { id: booking.id },
            data: {
              creditsCost: newCost,
              originalCost: booking.originalCost || originalCost
            }
          })

          // Add credits to user's balance
          await tx.creditBalance.update({
            where: { userId: booking.userId },
            data: {
              credits: { increment: refundAmount }
            }
          })

          // Create refund transaction record
          await tx.creditTransaction.create({
            data: {
              userId: booking.userId,
              type: 'REFUND_ADJUSTMENT',
              amount: refundAmount,
              description: `Price reduction refund for ${trip.destination.name} (${currentPassengerCount} passengers)`
            }
          })

          result.refundDetails.push({
            bookingId: booking.id,
            userId: booking.userId,
            userName: booking.user.name || booking.user.email || 'Unknown',
            originalCost,
            newCost,
            refundAmount
          })

          result.refundsProcessed++
          result.totalRefunded += refundAmount

          console.log(`[REFUNDS] ✅ Refunded R${refundAmount} to ${booking.user.name || booking.user.email}`)
        } else {
          console.log(`[REFUNDS] No refund needed for booking ${booking.id} (already at optimal price)`)
        }
      }

      // Update the new booking to have the correct cost and set originalCost
      const newBooking = trip.bookings.find(b => b.id === newBookingId)
      if (newBooking && newBooking.creditsCost !== newPricing.costPerPerson) {
        await tx.booking.update({
          where: { id: newBookingId },
          data: {
            creditsCost: newPricing.costPerPerson,
            originalCost: newBooking.creditsCost // Store what they originally paid
          }
        })
        console.log(`[REFUNDS] Updated new booking cost to R${newPricing.costPerPerson}`)
      }
    })

    result.success = true
    console.log(`[REFUNDS] ✅ Successfully processed ${result.refundsProcessed} refunds totaling R${result.totalRefunded}`)

  } catch (error) {
    console.error('[REFUNDS] Error processing retroactive refunds:', error)
    result.errors.push(error instanceof Error ? error.message : 'Unknown error')
  }

  return result
}

/**
 * Send refund notifications to affected users
 */
export async function sendRefundNotifications(refundDetails: RefundResult['refundDetails']): Promise<void> {
  try {
    for (const refund of refundDetails) {
      if (refund.refundAmount > 0) {
        // Create notification for the user
        await prisma.notification.create({
          data: {
            userId: refund.userId,
            title: 'Trip Price Reduced!',
            message: `Great news! More passengers joined your trip, so you received R${refund.refundAmount} back in credits. Your new trip cost is R${refund.newCost}.`,
            type: 'PAYMENT_CONFIRMATION',
            priority: 'MEDIUM',
            data: {
              refundAmount: refund.refundAmount,
              originalCost: refund.originalCost,
              newCost: refund.newCost,
              bookingId: refund.bookingId
            }
          }
        })

        console.log(`[REFUNDS] 📧 Notification sent to ${refund.userName} about R${refund.refundAmount} refund`)
      }
    }
  } catch (error) {
    console.error('[REFUNDS] Error sending refund notifications:', error)
  }
}

/**
 * Get refund history for a specific trip
 */
export async function getTripRefundHistory(tripId: string): Promise<Array<{
  bookingId: string
  userId: string
  userName: string
  refundAmount: number
  refundDate: Date
  description: string
}>> {
  try {
    const refundTransactions = await prisma.creditTransaction.findMany({
      where: {
        type: 'REFUND_ADJUSTMENT',
        description: {
          contains: 'Price reduction refund'
        },
        user: {
          bookings: {
            some: {
              tripId: tripId
            }
          }
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            bookings: {
              where: { tripId },
              select: { id: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return refundTransactions.map(transaction => ({
      bookingId: transaction.user.bookings[0]?.id || '',
      userId: transaction.userId,
      userName: transaction.user.name || transaction.user.email || 'Unknown',
      refundAmount: transaction.amount,
      refundDate: transaction.createdAt,
      description: transaction.description || ''
    }))

  } catch (error) {
    console.error('Error getting trip refund history:', error)
    return []
  }
}