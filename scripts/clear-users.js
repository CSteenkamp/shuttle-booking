#!/usr/bin/env node

/**
 * DANGEROUS SCRIPT: Clear all users from database
 * 
 * This script will permanently delete ALL users from the database.
 * Use with extreme caution and only when necessary.
 * 
 * Usage: node scripts/clear-users.js
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function clearAllUsers() {
  console.log('🚨 WARNING: This will delete ALL users from the database!')
  console.log('This action cannot be undone.\n')
  
  try {
    console.log('📊 Checking current user count...')
    const userCount = await prisma.user.count()
    console.log(`Found ${userCount} users in database\n`)
    
    if (userCount === 0) {
      console.log('✅ No users to delete.')
      return
    }
    
    console.log('🗑️  Starting user cleanup...\n')
    
    // Delete related data first to avoid foreign key constraints
    console.log('1. Deleting user sessions...')
    const sessionResult = await prisma.session.deleteMany({})
    console.log(`   ✅ Deleted ${sessionResult.count} sessions`)
    
    console.log('2. Deleting verification tokens...')
    const tokenResult = await prisma.verificationToken.deleteMany({})
    console.log(`   ✅ Deleted ${tokenResult.count} verification tokens`)
    
    console.log('3. Deleting credit balances...')
    const creditResult = await prisma.creditBalance.deleteMany({})
    console.log(`   ✅ Deleted ${creditResult.count} credit balances`)
    
    console.log('4. Deleting bookings...')
    const bookingResult = await prisma.booking.deleteMany({})
    console.log(`   ✅ Deleted ${bookingResult.count} bookings`)
    
    console.log('5. Deleting riders...')
    const riderResult = await prisma.rider.deleteMany({})
    console.log(`   ✅ Deleted ${riderResult.count} riders`)
    
    console.log('6. Deleting pickup locations...')
    const locationResult = await prisma.pickupLocation.deleteMany({})
    console.log(`   ✅ Deleted ${locationResult.count} pickup locations`)
    
    console.log('7. Deleting payment transactions...')
    const paymentResult = await prisma.paymentTransaction.deleteMany({})
    console.log(`   ✅ Deleted ${paymentResult.count} payment transactions`)
    
    console.log('8. Deleting audit logs...')
    const auditResult = await prisma.auditLog.deleteMany({})
    console.log(`   ✅ Deleted ${auditResult.count} audit logs`)
    
    console.log('9. Finally, deleting users...')
    const userResult = await prisma.user.deleteMany({})
    console.log(`   ✅ Deleted ${userResult.count} users`)
    
    console.log('\n🎉 Database cleanup completed successfully!')
    console.log('All users and related data have been removed.')
    console.log('\n📝 Next steps:')
    console.log('1. Create a new admin account via signup')
    console.log('2. Test login functionality')
    console.log('3. Verify email verification flow')
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    console.log('\n🔧 Common issues:')
    console.log('- Foreign key constraints (delete related data first)')
    console.log('- Database connection issues')
    console.log('- Permission problems')
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  console.log('🛠️  User Database Cleanup Script')
  console.log('================================\n')
  
  // Safety check - require confirmation
  const args = process.argv.slice(2)
  if (!args.includes('--confirm')) {
    console.log('❌ This script requires confirmation to run.')
    console.log('Usage: node scripts/clear-users.js --confirm')
    console.log('\n⚠️  This will permanently delete ALL users!')
    process.exit(1)
  }
  
  await clearAllUsers()
}

main().catch(console.error)