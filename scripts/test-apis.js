const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testAPIs() {
  try {
    console.log('🧪 Testing API functionality...\n')

    // Test 1: Check credit packages
    console.log('1️⃣ Testing Credit Packages:')
    const packages = await prisma.creditPackage.findMany()
    console.log(`   ✅ Found ${packages.length} credit packages`)
    packages.forEach(pkg => {
      const savings = (pkg.credits * 25) - pkg.price
      console.log(`   📦 ${pkg.name}: ${pkg.credits} credits for R${pkg.price} (saves R${savings})`)
    })

    // Test 2: Check pricing settings
    console.log('\n2️⃣ Testing Pricing Settings:')
    const settings = await prisma.settings.findMany({
      where: { key: { in: ['creditValue', 'baseTripCost'] } }
    })
    settings.forEach(setting => {
      console.log(`   ⚙️ ${setting.key}: ${setting.value}`)
    })

    // Test 3: Check locations with categories
    console.log('\n3️⃣ Testing Location Management:')
    const locations = await prisma.location.findMany({
      include: {
        _count: {
          select: {
            trips: true,
            pickupBookings: true,
            dropoffBookings: true
          }
        }
      }
    })
    console.log(`   ✅ Found ${locations.length} locations`)
    
    const categoryCounts = {}
    locations.forEach(loc => {
      const category = loc.category || 'other'
      categoryCounts[category] = (categoryCounts[category] || 0) + 1
    })
    
    Object.entries(categoryCounts).forEach(([category, count]) => {
      console.log(`   📍 ${category}: ${count} locations`)
    })

    // Test 4: Check users and credits
    console.log('\n4️⃣ Testing User Management:')
    const users = await prisma.user.findMany({
      include: {
        creditBalance: true,
        _count: { select: { bookings: true } }
      }
    })
    console.log(`   ✅ Found ${users.length} users`)
    
    const adminCount = users.filter(u => u.role === 'ADMIN').length
    const customerCount = users.filter(u => u.role === 'CUSTOMER').length
    console.log(`   👑 Admins: ${adminCount}`)
    console.log(`   👥 Customers: ${customerCount}`)

    // Test 5: Check trips and bookings
    console.log('\n5️⃣ Testing Trip & Booking System:')
    const trips = await prisma.trip.findMany({
      include: {
        _count: { select: { bookings: true } }
      }
    })
    const bookings = await prisma.booking.findMany()
    console.log(`   ✅ Found ${trips.length} trips`)
    console.log(`   ✅ Found ${bookings.length} bookings`)

    // Test 6: Revenue calculation
    console.log('\n6️⃣ Testing Revenue Tracking:')
    const transactions = await prisma.creditTransaction.findMany({
      include: {
        user: { select: { role: true } }
      }
    })
    
    const customerPurchases = transactions
      .filter(t => t.type === 'PURCHASE' && t.user.role === 'CUSTOMER')
      .reduce((sum, t) => sum + t.amount, 0)
    
    const totalUsage = transactions
      .filter(t => t.type === 'USAGE')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)
    
    const creditValue = parseFloat(settings.find(s => s.key === 'creditValue')?.value || '25')
    const revenue = customerPurchases * creditValue
    
    console.log(`   💰 Customer credit purchases: ${customerPurchases} credits`)
    console.log(`   💳 Total credit usage: ${totalUsage} credits`)
    console.log(`   💵 Total revenue: R${revenue}`)

    console.log('\n✅ All tests completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testAPIs()