import { prisma } from '@/lib/prisma'

export interface PricingInfo {
  costPerPerson: number
  totalCost: number
  passengerCount: number
  destinationName: string
  savings?: number // Amount saved compared to single passenger rate
}

export interface PricingTier {
  passengerCount: number
  costPerPerson: number
}

/**
 * Calculate the cost for a trip based on destination and passenger count
 */
export async function calculateTripCost(
  destinationId: string, 
  currentPassengerCount: number
): Promise<PricingInfo | null> {
  try {
    // Get the destination with its pricing tiers
    const destination = await prisma.location.findUnique({
      where: { id: destinationId },
      include: {
        pricingTiers: {
          orderBy: { passengerCount: 'asc' }
        }
      }
    })

    if (!destination) {
      throw new Error(`Destination with ID ${destinationId} not found`)
    }

    // If no pricing tiers exist, fall back to simple credit system (1 credit per passenger)
    if (!destination.pricingTiers || destination.pricingTiers.length === 0) {
      return {
        costPerPerson: 1,
        totalCost: currentPassengerCount,
        passengerCount: currentPassengerCount,
        destinationName: destination.name
      }
    }

    // Find the appropriate pricing tier for the passenger count
    const pricingTier = destination.pricingTiers.find(
      tier => tier.passengerCount === currentPassengerCount
    )

    if (!pricingTier) {
      // If no exact match, use the highest available tier (shouldn't happen with proper data)
      const maxTier = destination.pricingTiers[destination.pricingTiers.length - 1]
      console.warn(`No pricing tier for ${currentPassengerCount} passengers, using max tier`)
      
      return {
        costPerPerson: maxTier.costPerPerson,
        totalCost: maxTier.costPerPerson * currentPassengerCount,
        passengerCount: currentPassengerCount,
        destinationName: destination.name
      }
    }

    // Calculate savings compared to single passenger rate
    const singlePassengerTier = destination.pricingTiers.find(tier => tier.passengerCount === 1)
    const savings = singlePassengerTier && currentPassengerCount > 1 
      ? singlePassengerTier.costPerPerson - pricingTier.costPerPerson
      : undefined

    return {
      costPerPerson: pricingTier.costPerPerson,
      totalCost: pricingTier.costPerPerson * currentPassengerCount,
      passengerCount: currentPassengerCount,
      destinationName: destination.name,
      savings
    }

  } catch (error) {
    console.error('Error calculating trip cost:', error)
    return null
  }
}

/**
 * Get all pricing tiers for a destination
 */
export async function getDestinationPricingTiers(destinationId: string): Promise<PricingTier[]> {
  try {
    const destination = await prisma.location.findUnique({
      where: { id: destinationId },
      include: {
        pricingTiers: {
          orderBy: { passengerCount: 'asc' }
        }
      }
    })

    if (!destination || !destination.pricingTiers) {
      return []
    }

    return destination.pricingTiers.map(tier => ({
      passengerCount: tier.passengerCount,
      costPerPerson: tier.costPerPerson
    }))

  } catch (error) {
    console.error('Error getting destination pricing tiers:', error)
    return []
  }
}

/**
 * Calculate the cost difference for retroactive refunds
 */
export async function calculateRefundAmount(
  originalCost: number,
  destinationId: string,
  newPassengerCount: number
): Promise<number> {
  try {
    const newPricing = await calculateTripCost(destinationId, newPassengerCount)
    
    if (!newPricing) {
      return 0
    }

    const refundAmount = originalCost - newPricing.costPerPerson
    return Math.max(0, refundAmount) // Never negative refund

  } catch (error) {
    console.error('Error calculating refund amount:', error)
    return 0
  }
}

/**
 * Get pricing display information for UI
 */
export async function getPricingDisplay(destinationId: string): Promise<{
  destinationName: string
  duration?: number
  baseCost?: number
  tiers: Array<{
    passengers: number
    costPerPerson: number
    totalCost: number
    savings?: number
  }>
} | null> {
  try {
    const destination = await prisma.location.findUnique({
      where: { id: destinationId },
      include: {
        pricingTiers: {
          orderBy: { passengerCount: 'asc' }
        }
      }
    })

    if (!destination) {
      return null
    }

    const singlePassengerCost = destination.pricingTiers.find(t => t.passengerCount === 1)?.costPerPerson || 0

    const tiers = destination.pricingTiers.map(tier => ({
      passengers: tier.passengerCount,
      costPerPerson: tier.costPerPerson,
      totalCost: tier.costPerPerson * tier.passengerCount,
      savings: tier.passengerCount > 1 ? singlePassengerCost - tier.costPerPerson : undefined
    }))

    return {
      destinationName: destination.name,
      duration: destination.defaultDuration || undefined,
      baseCost: destination.baseCost || undefined,
      tiers
    }

  } catch (error) {
    console.error('Error getting pricing display:', error)
    return null
  }
}

/**
 * Check if a destination supports dynamic pricing
 */
export async function hasDynamicPricing(destinationId: string): Promise<boolean> {
  try {
    const pricingTiersCount = await prisma.pricingTier.count({
      where: { locationId: destinationId }
    })

    return pricingTiersCount > 0

  } catch (error) {
    console.error('Error checking dynamic pricing:', error)
    return false
  }
}