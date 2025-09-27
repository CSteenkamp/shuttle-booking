#!/usr/bin/env node

/**
 * Script to add the requested credit packages:
 * 50, 100, 150, 200, and 500 credits with appropriate pricing
 */

const BASE_URL = process.env.NEXT_PUBLIC_URL || 'http://localhost:3001'

const creditPackages = [
  {
    name: "Starter Pack",
    credits: 50,
    price: 50, // R1 per credit
    isPopular: false,
    isActive: true
  },
  {
    name: "Value Pack", 
    credits: 100,
    price: 100, // R1 per credit
    isPopular: true, // Most popular
    isActive: true
  },
  {
    name: "Family Pack",
    credits: 150, 
    price: 150, // R1 per credit
    isPopular: false,
    isActive: true
  },
  {
    name: "Premium Pack",
    credits: 200,
    price: 200, // R1 per credit
    isPopular: false,
    isActive: true
  },
  {
    name: "Ultimate Pack",
    credits: 500,
    price: 500, // R1 per credit
    isPopular: false,
    isActive: true
  }
]

async function createCreditPackages() {
  console.log('🚀 Adding credit packages to Tjoef-Tjaf...\n')
  
  let successCount = 0
  let errors = []

  for (const pkg of creditPackages) {
    try {
      console.log(`➡️  Adding ${pkg.name} (${pkg.credits} credits for R${pkg.price})...`)
      
      const response = await fetch(`${BASE_URL}/api/admin/pricing/packages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: In production, you'd need proper authentication
          // For now, we'll need to run this with admin session
        },
        body: JSON.stringify(pkg)
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`✅ Successfully added ${pkg.name}`)
        console.log(`   Price per credit: R${(pkg.price / pkg.credits).toFixed(2)}`)
        console.log(`   Savings vs base rate: R${((25 - (pkg.price / pkg.credits)) * pkg.credits).toFixed(2)}\n`)
        successCount++
      } else {
        const error = await response.json()
        console.error(`❌ Failed to add ${pkg.name}: ${error.error}`)
        errors.push(`${pkg.name}: ${error.error}`)
      }
    } catch (error) {
      console.error(`❌ Error adding ${pkg.name}:`, error.message)
      errors.push(`${pkg.name}: ${error.message}`)
    }
  }

  console.log('\n📊 Summary:')
  console.log(`✅ Successfully added: ${successCount}/${creditPackages.length} packages`)
  
  if (errors.length > 0) {
    console.log(`❌ Errors encountered:`)
    errors.forEach(error => console.log(`   • ${error}`))
  }

  console.log('\n💡 Package Overview:')
  creditPackages.forEach(pkg => {
    const pricePerCredit = pkg.price / pkg.credits
    const savings = (25 - pricePerCredit) * pkg.credits
    const savingsPercent = ((25 - pricePerCredit) / 25 * 100).toFixed(1)
    console.log(`   ${pkg.name}: ${pkg.credits} credits for R${pkg.price} (R${pricePerCredit.toFixed(2)}/credit, ${savingsPercent}% off)`)
  })
}

// Authentication note
console.log('⚠️  IMPORTANT: You need to be logged in as an admin for this script to work.')
console.log('   Please log in to your admin account at /auth/signin first.\n')

createCreditPackages().catch(console.error)