#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function setupCreditPackages() {
  console.log('🔧 Setting up credit packages...')

  try {
    // Clear existing packages first
    await prisma.creditPackage.deleteMany({})
    console.log('✅ Cleared existing credit packages')

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

    console.log('📦 Creating credit packages...')
    
    for (const packageData of packages) {
      const createdPackage = await prisma.creditPackage.create({
        data: packageData
      })
      
      console.log(`   ✅ Created: ${createdPackage.name} - ${createdPackage.credits} credits for R${createdPackage.price}${createdPackage.isPopular ? ' (Popular)' : ''}`)
    }

    console.log('\n💰 Package Summary:')
    console.log('   • Starter Pack: 50 credits for R50 (R1 per credit)')
    console.log('   • Value Pack: 100 credits for R100 (R1 per credit) [Popular]')
    console.log('   • Premium Pack: 200 credits for R200 (R1 per credit)')
    console.log('   • Ultimate Pack: 500 credits for R500 (R1 per credit)')

    console.log('\n🎯 All packages offer 1:1 credit-to-rand ratio as requested')
    console.log('✅ Credit packages setup completed successfully!')

  } catch (error) {
    console.error('❌ Error setting up credit packages:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

setupCreditPackages()