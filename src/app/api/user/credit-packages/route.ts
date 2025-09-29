import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get active credit packages for customers
    const packages = await prisma.creditPackage.findMany({
      where: { isActive: true },
      orderBy: [
        { isPopular: 'desc' },
        { credits: 'asc' }
      ]
    })

    // Add price per credit calculation to each package
    const packagesWithPricing = packages.map(pkg => ({
      ...pkg,
      pricePerCredit: pkg.price / pkg.credits
    }))

    return NextResponse.json(packagesWithPricing)
  } catch (error) {
    console.error('Error fetching credit packages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}