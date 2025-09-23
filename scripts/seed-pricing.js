const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedPricing() {
  try {
    console.log('🌱 Seeding pricing data...')

    // Create default pricing settings
    await prisma.settings.upsert({
      where: { key: 'creditValue' },
      update: { value: '25' },
      create: {
        key: 'creditValue',
        value: '25',
        description: 'Cost per credit in South African Rand'
      }
    })

    await prisma.settings.upsert({
      where: { key: 'baseTripCost' },
      update: { value: '1' },
      create: {
        key: 'baseTripCost',
        value: '1',
        description: 'Credits required per passenger per trip'
      }
    })

    // Create sample credit packages
    const packages = [
      {
        name: 'Starter Pack',
        credits: 5,
        price: 100,
        isPopular: false,
        isActive: true
      },
      {
        name: 'Family Pack',
        credits: 15,
        price: 300,
        isPopular: true,
        isActive: true
      },
      {
        name: 'Premium Pack',
        credits: 25,
        price: 450,
        isPopular: false,
        isActive: true
      },
      {
        name: 'Bulk Pack',
        credits: 50,
        price: 800,
        isPopular: false,
        isActive: true
      }
    ]

    for (const pkg of packages) {
      await prisma.creditPackage.upsert({
        where: { name: pkg.name },
        update: pkg,
        create: pkg
      })
    }

    console.log('✅ Pricing data seeded successfully!')
    console.log('📦 Created credit packages:')
    console.log('  • Starter Pack: 5 credits for R100 (R20/credit)')
    console.log('  • Family Pack: 15 credits for R300 (R20/credit) - Popular')
    console.log('  • Premium Pack: 25 credits for R450 (R18/credit)')
    console.log('  • Bulk Pack: 50 credits for R800 (R16/credit)')
    console.log('')
    console.log('💰 Pricing settings:')
    console.log('  • Credit Value: R25 per credit')
    console.log('  • Base Trip Cost: 1 credit per passenger')
    console.log('  • Actual Trip Cost: R25 per passenger')

  } catch (error) {
    console.error('❌ Error seeding pricing data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

seedPricing()