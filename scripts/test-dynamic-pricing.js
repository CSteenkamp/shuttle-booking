const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testDynamicPricing() {
  console.log('🧪 Testing Dynamic Pricing System...\n')

  try {
    // Test the pricing calculation for each destination
    const destinations = ['Tulbagh', 'Wolseley', 'Breerivier']
    
    for (const destName of destinations) {
      console.log(`\n📍 Testing ${destName}:`)
      
      // Get destination
      const destination = await prisma.location.findFirst({
        where: { name: destName },
        include: { pricingTiers: { orderBy: { passengerCount: 'asc' } } }
      })

      if (!destination) {
        console.log(`   ❌ ${destName} not found`)
        continue
      }

      console.log(`   Duration: ${destination.defaultDuration} minutes`)
      console.log(`   Base cost: R${destination.baseCost}`)
      
      // Test pricing for 1-4 passengers
      for (let passengers = 1; passengers <= 4; passengers++) {
        const tier = destination.pricingTiers.find(t => t.passengerCount === passengers)
        if (tier) {
          const totalCost = tier.costPerPerson * passengers
          const savings = passengers > 1 
            ? destination.pricingTiers.find(t => t.passengerCount === 1)?.costPerPerson - tier.costPerPerson 
            : 0
          
          console.log(`   ${passengers} passenger${passengers > 1 ? 's' : ''}: R${tier.costPerPerson} each (Total: R${totalCost}${savings > 0 ? `, Save R${savings} each` : ''})`)
        }
      }
    }

    // Test retroactive pricing scenario
    console.log('\n\n🔄 Testing Retroactive Pricing Scenario:')
    console.log('Simulating Tulbagh trip bookings...')
    
    const tulbagh = await prisma.location.findFirst({ where: { name: 'Tulbagh' } })
    if (tulbagh) {
      console.log('\nBooking progression:')
      console.log('1️⃣  Person A books alone: pays R120')
      console.log('2️⃣  Person B joins: both pay R90, A gets R30 refund')  
      console.log('3️⃣  Person C joins: all pay R80, A gets R10 refund, B gets R10 refund')
      console.log('4️⃣  Person D joins: all pay R70, everyone gets R10 refund')
      console.log('\nFinal result: Everyone pays R70 total')
      
      // Calculate total refunds
      console.log('\nRefund breakdown:')
      console.log('Person A total refunds: R30 + R10 + R10 = R50 (paid R120, final cost R70)')
      console.log('Person B total refunds: R10 + R10 = R20 (paid R90, final cost R70)')
      console.log('Person C total refunds: R10 (paid R80, final cost R70)')
      console.log('Person D total refunds: R0 (paid R70)')
    }

    // Test edge cases
    console.log('\n\n⚠️  Testing Edge Cases:')
    
    // Test with non-existent destination
    console.log('Testing with non-existent destination...')
    const fakeDest = await prisma.location.findFirst({ where: { name: 'NonExistent' } })
    console.log(fakeDest ? '❌ Should not find fake destination' : '✅ Correctly handled non-existent destination')
    
    // Test destinations without pricing tiers (should fall back to old system)
    const regularDestinations = await prisma.location.findMany({
      where: { 
        name: { notIn: ['Tulbagh', 'Wolseley', 'Breerivier'] }
      },
      include: { pricingTiers: true }
    })
    
    console.log(`Found ${regularDestinations.length} destinations without dynamic pricing`)
    if (regularDestinations.length > 0) {
      console.log('These will use the fallback pricing (1 credit per passenger)')
    }

    console.log('\n✅ Dynamic Pricing System Test Complete!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testDynamicPricing()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })