const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function seedNewDestinations() {
  console.log('🌱 Seeding new destinations with dynamic pricing...')

  try {
    // Define the new destinations with their pricing
    const destinations = [
      {
        name: 'Tulbagh',
        address: 'Tulbagh, Western Cape, South Africa',
        category: 'wine_region',
        defaultDuration: 90, // 1h 30m
        baseCost: 120,
        isFrequent: true,
        pricingTiers: [
          { passengerCount: 1, costPerPerson: 120 },
          { passengerCount: 2, costPerPerson: 90 },
          { passengerCount: 3, costPerPerson: 80 },
          { passengerCount: 4, costPerPerson: 70 }
        ]
      },
      {
        name: 'Wolseley',
        address: 'Wolseley, Western Cape, South Africa',
        category: 'town',
        defaultDuration: 40, // 40 minutes
        baseCost: 80,
        isFrequent: true,
        pricingTiers: [
          { passengerCount: 1, costPerPerson: 80 },
          { passengerCount: 2, costPerPerson: 70 },
          { passengerCount: 3, costPerPerson: 60 },
          { passengerCount: 4, costPerPerson: 50 }
        ]
      },
      {
        name: 'Breerivier',
        address: 'Breerivier, Western Cape, South Africa',
        category: 'town',
        defaultDuration: 60, // 60 minutes
        baseCost: 100,
        isFrequent: true,
        pricingTiers: [
          { passengerCount: 1, costPerPerson: 100 },
          { passengerCount: 2, costPerPerson: 90 },
          { passengerCount: 3, costPerPerson: 80 },
          { passengerCount: 4, costPerPerson: 70 }
        ]
      }
    ]

    for (const dest of destinations) {
      console.log(`\n📍 Creating destination: ${dest.name}`)
      
      // Check if destination already exists
      const existingLocation = await prisma.location.findFirst({
        where: { name: dest.name }
      })

      let location
      if (existingLocation) {
        console.log(`   ⚠️  Location ${dest.name} already exists, updating...`)
        location = await prisma.location.update({
          where: { id: existingLocation.id },
          data: {
            address: dest.address,
            category: dest.category,
            defaultDuration: dest.defaultDuration,
            baseCost: dest.baseCost,
            isFrequent: dest.isFrequent,
            status: 'APPROVED'
          }
        })
        
        // Delete existing pricing tiers
        await prisma.pricingTier.deleteMany({
          where: { locationId: location.id }
        })
      } else {
        location = await prisma.location.create({
          data: {
            name: dest.name,
            address: dest.address,
            category: dest.category,
            defaultDuration: dest.defaultDuration,
            baseCost: dest.baseCost,
            isFrequent: dest.isFrequent,
            status: 'APPROVED'
          }
        })
        console.log(`   ✅ Created location: ${location.id}`)
      }

      // Create pricing tiers
      console.log(`   💰 Creating pricing tiers...`)
      for (const tier of dest.pricingTiers) {
        await prisma.pricingTier.create({
          data: {
            locationId: location.id,
            passengerCount: tier.passengerCount,
            costPerPerson: tier.costPerPerson
          }
        })
        console.log(`      ${tier.passengerCount} passenger(s): R${tier.costPerPerson} each`)
      }
    }

    console.log('\n✅ New destinations seeded successfully!')
    
    // Display summary
    console.log('\n📊 Pricing Summary:')
    for (const dest of destinations) {
      console.log(`\n${dest.name} (${dest.defaultDuration} min):`)
      dest.pricingTiers.forEach(tier => {
        const total = tier.costPerPerson * tier.passengerCount
        console.log(`  ${tier.passengerCount} pax: R${tier.costPerPerson} each (Total: R${total})`)
      })
    }

  } catch (error) {
    console.error('❌ Error seeding destinations:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedNewDestinations()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })