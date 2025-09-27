/**
 * Manual Credit Package Addition Script
 * 
 * This script shows the exact API calls needed to add the credit packages.
 * You can run these one by one through the admin interface or copy them to browser console.
 */

const packages = [
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
    price: 100, // R1 per credit (most popular)
    isPopular: true,
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

console.log('🎯 Credit Packages to Add:')
console.log('===============================')

packages.forEach((pkg, index) => {
  const pricePerCredit = pkg.price / pkg.credits
  const savingsVsBase = (25 - pricePerCredit) * pkg.credits
  const savingsPercent = ((savingsVsBase / (25 * pkg.credits)) * 100).toFixed(1)
  
  console.log(`\n${index + 1}. ${pkg.name}`)
  console.log(`   Credits: ${pkg.credits}`)
  console.log(`   Price: R${pkg.price}`)
  console.log(`   Price per credit: R${pricePerCredit.toFixed(2)}`)
  console.log(`   Savings vs R25/credit: R${savingsVsBase.toFixed(2)} (${savingsPercent}%)`)
  console.log(`   Popular: ${pkg.isPopular ? 'Yes' : 'No'}`)
})

console.log('\n\n🔧 To add these packages:')
console.log('1. Go to /admin/pricing in your browser')
console.log('2. Click "Add Package" for each one')
console.log('3. Or copy this script and run it in browser console while logged in as admin:')

console.log('\n💻 Browser Console Script:')
console.log('=========================')

const browserScript = `
// Run this in browser console while logged in as admin at /admin/pricing
const packages = ${JSON.stringify(packages, null, 2)};

async function addPackages() {
  for (const pkg of packages) {
    try {
      const response = await fetch('/api/admin/pricing/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pkg)
      });
      
      if (response.ok) {
        console.log('✅ Added:', pkg.name);
      } else {
        const error = await response.json();
        console.error('❌ Failed to add', pkg.name, ':', error.error);
      }
    } catch (error) {
      console.error('❌ Error adding', pkg.name, ':', error);
    }
  }
  console.log('🎉 Package addition completed! Refresh the page to see them.');
}

addPackages();
`

console.log(browserScript)

// For Node.js execution (if running from admin session)
if (typeof window === 'undefined' && typeof fetch !== 'undefined') {
  console.log('\n🚀 Executing package addition...')
  
  async function addPackagesNode() {
    for (const pkg of packages) {
      try {
        // This would need proper authentication in a real scenario
        console.log(`Adding ${pkg.name}...`)
        // In real implementation, you'd make the API call here
      } catch (error) {
        console.error(`Error adding ${pkg.name}:`, error)
      }
    }
  }
}