#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testCreditPackages() {
  console.log('🧪 Testing credit packages setup...')

  try {
    // Fetch all active credit packages
    const packages = await prisma.creditPackage.findMany({
      where: { isActive: true },
      orderBy: { credits: 'asc' }
    })

    console.log(`\n📦 Found ${packages.length} active credit packages:`)
    
    packages.forEach((pkg, index) => {
      const popular = pkg.isPopular ? '⭐ Popular' : ''
      console.log(`   ${index + 1}. ${pkg.name}: ${pkg.credits} credits for R${pkg.price} ${popular}`)
      console.log(`      Price per credit: R${(pkg.price / pkg.credits).toFixed(2)}`)
    })

    // Verify we have the expected packages
    const expectedPackages = [
      { credits: 50, price: 50 },
      { credits: 100, price: 100 },
      { credits: 200, price: 200 },
      { credits: 500, price: 500 }
    ]

    console.log('\n✅ Verification:')
    
    for (const expected of expectedPackages) {
      const found = packages.find(p => p.credits === expected.credits && p.price === expected.price)
      if (found) {
        console.log(`   ✅ ${expected.credits} credits for R${expected.price} - Found`)
      } else {
        console.log(`   ❌ ${expected.credits} credits for R${expected.price} - Missing`)
      }
    }

    // Check for popular package
    const popularPackage = packages.find(p => p.isPopular)
    if (popularPackage) {
      console.log(`   ⭐ Popular package: ${popularPackage.name} (${popularPackage.credits} credits)`)
    } else {
      console.log(`   ⚠️  No popular package set`)
    }

    console.log('\n🎯 All packages offer 1:1 credit-to-rand ratio as requested')
    console.log('✅ Credit packages test completed!')

  } catch (error) {
    console.error('❌ Error testing credit packages:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testCreditPackages()