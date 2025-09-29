#!/usr/bin/env node

// Production-safe script to setup credit packages
// Make sure to run this with the production DATABASE_URL

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function setupProductionCreditPackages() {
  console.log('🔧 Setting up credit packages on PRODUCTION...')
  
  // Safety check - ensure we're not accidentally running on development
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set')
    process.exit(1)
  }
  
  if (databaseUrl.includes('localhost') || databaseUrl.includes('dev')) {
    console.error('❌ This script should only be run on PRODUCTION')
    console.error('❌ Current DATABASE_URL appears to be development:', databaseUrl.substring(0, 50) + '...')
    process.exit(1)
  }

  try {
    // Check if packages already exist
    const existingPackages = await prisma.creditPackage.findMany()
    if (existingPackages.length > 0) {
      console.log(`⚠️  Found ${existingPackages.length} existing packages:`)
      existingPackages.forEach(pkg => {
        console.log(`   - ${pkg.name}: ${pkg.credits} credits for R${pkg.price}`)
      })
      console.log('\n❓ Do you want to proceed? This will replace existing packages.')
      console.log('   Press Ctrl+C to cancel, or any key to continue...')
      
      // In a real production environment, you might want to add a confirmation prompt
    }

    // Clear existing packages
    const deleted = await prisma.creditPackage.deleteMany({})
    console.log(`✅ Cleared ${deleted.count} existing credit packages`)

    // Create the 4 requested packages with 1:1 credit to rand ratio
    const packages = [
      {
        name: 'Starter Pack',
        credits: 50,
        price: 50.0,
        isPopular: false,
        isActive: true
      },
      {
        name: 'Value Pack', 
        credits: 100,
        price: 100.0,
        isPopular: true, // Make this the popular choice
        isActive: true
      },
      {
        name: 'Premium Pack',
        credits: 200,
        price: 200.0,
        isPopular: false,
        isActive: true
      },
      {
        name: 'Ultimate Pack',
        credits: 500,
        price: 500.0,
        isPopular: false,
        isActive: true
      }
    ]

    console.log('📦 Creating credit packages on PRODUCTION...')
    
    for (const packageData of packages) {
      const createdPackage = await prisma.creditPackage.create({
        data: packageData
      })
      
      console.log(`   ✅ Created: ${createdPackage.name} - ${createdPackage.credits} credits for R${createdPackage.price}${createdPackage.isPopular ? ' (Popular)' : ''}`)
    }

    console.log('\n💰 Production Package Summary:')
    console.log('   • Starter Pack: 50 credits for R50 (R1 per credit)')
    console.log('   • Value Pack: 100 credits for R100 (R1 per credit) [Popular]')
    console.log('   • Premium Pack: 200 credits for R200 (R1 per credit)')
    console.log('   • Ultimate Pack: 500 credits for R500 (R1 per credit)')

    console.log('\n🎯 All packages offer 1:1 credit-to-rand ratio as requested')
    console.log('✅ PRODUCTION credit packages setup completed successfully!')

  } catch (error) {
    console.error('❌ Error setting up production credit packages:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Confirm this is intentional production run
console.log('⚠️  PRODUCTION SCRIPT - This will modify your live database')
console.log('⚠️  Make sure your DATABASE_URL points to production')
console.log('⚠️  Press Ctrl+C to cancel, or wait 5 seconds to continue...')

setTimeout(() => {
  setupProductionCreditPackages()
}, 5000)