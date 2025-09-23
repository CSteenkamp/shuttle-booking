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

    // Get current credit value setting for comparison
    const creditValueSetting = await prisma.settings.findUnique({
      where: { key: 'creditValue' }
    })
    const creditValue = parseFloat(creditValueSetting?.value || '25')

    // Add savings calculation to each package
    const packagesWithSavings = packages.map(pkg => {
      const regularPrice = pkg.credits * creditValue
      const savings = regularPrice - pkg.price
      const savingsPercentage = savings > 0 ? Math.round((savings / regularPrice) * 100) : 0
      
      return {
        ...pkg,
        regularPrice,
        savings: savings > 0 ? savings : 0,
        savingsPercentage,
        pricePerCredit: pkg.price / pkg.credits
      }
    })

    return NextResponse.json(packagesWithSavings)
  } catch (error) {
    console.error('Error fetching credit packages:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}