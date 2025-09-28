#!/usr/bin/env node

/**
 * Delete Specific User Script
 * 
 * This script safely deletes a specific user and all their related data
 * from the database while maintaining referential integrity.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function deleteUserByEmail(email) {
  console.log(`🗑️  Deleting user: ${email}`)
  console.log('================================\n')
  
  try {
    // First, find the user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        riders: true,
        bookings: true,
        pickupLocations: true,
        creditBalance: true
      }
    })
    
    if (!user) {
      console.log(`❌ User ${email} not found in database`)
      return
    }
    
    console.log(`✅ Found user: ${user.name || 'No name'} (${user.email})`)
    console.log(`   Role: ${user.role}`)
    console.log(`   Verified: ${user.emailVerified ? 'Yes' : 'No'}`)
    console.log(`   Created: ${user.createdAt}`)
    console.log(`   Related data:`)
    console.log(`   - Riders: ${user.riders.length}`)
    console.log(`   - Bookings: ${user.bookings.length}`)
    console.log(`   - Pickup Locations: ${user.pickupLocations.length}`)
    console.log(`   - Credit Balance: ${user.creditBalance ? 'Yes' : 'No'}`)
    
    console.log('\n🗑️  Starting deletion process...\n')
    
    // Delete related data in correct order to avoid foreign key constraints
    
    // 1. Delete audit logs
    console.log('1. Deleting audit logs...')
    const auditResult = await prisma.auditLog.deleteMany({
      where: { userId: user.id }
    })
    console.log(`   ✅ Deleted ${auditResult.count} audit logs`)
    
    // 2. Delete payment transactions
    console.log('2. Deleting payment transactions...')
    const paymentResult = await prisma.paymentTransaction.deleteMany({
      where: { userId: user.id }
    })
    console.log(`   ✅ Deleted ${paymentResult.count} payment transactions`)
    
    // 3. Delete bookings
    console.log('3. Deleting bookings...')
    const bookingResult = await prisma.booking.deleteMany({
      where: { userId: user.id }
    })
    console.log(`   ✅ Deleted ${bookingResult.count} bookings`)
    
    // 4. Delete riders
    console.log('4. Deleting riders...')
    const riderResult = await prisma.rider.deleteMany({
      where: { userId: user.id }
    })
    console.log(`   ✅ Deleted ${riderResult.count} riders`)
    
    // 5. Delete pickup locations
    console.log('5. Deleting pickup locations...')
    const locationResult = await prisma.pickupLocation.deleteMany({
      where: { userId: user.id }
    })
    console.log(`   ✅ Deleted ${locationResult.count} pickup locations`)
    
    // 6. Delete credit balance
    console.log('6. Deleting credit balance...')
    const creditResult = await prisma.creditBalance.deleteMany({
      where: { userId: user.id }
    })
    console.log(`   ✅ Deleted ${creditResult.count} credit balance records`)
    
    // 7. Delete verification tokens
    console.log('7. Deleting verification tokens...')
    const tokenResult = await prisma.verificationToken.deleteMany({
      where: { 
        OR: [
          { identifier: user.email },
          { identifier: user.id }
        ]
      }
    })
    console.log(`   ✅ Deleted ${tokenResult.count} verification tokens`)
    
    // 8. Delete sessions
    console.log('8. Deleting sessions...')
    const sessionResult = await prisma.session.deleteMany({
      where: { userId: user.id }
    })
    console.log(`   ✅ Deleted ${sessionResult.count} sessions`)
    
    // 9. Finally, delete the user
    console.log('9. Deleting user account...')
    await prisma.user.delete({
      where: { id: user.id }
    })
    console.log(`   ✅ Deleted user account`)
    
    console.log('\n🎉 User deletion completed successfully!')
    console.log(`User ${email} and all related data have been removed.`)
    
  } catch (error) {
    console.error('❌ Error during user deletion:', error)
    console.log('\n🔧 Common issues:')
    console.log('- Foreign key constraints (delete related data first)')
    console.log('- Database connection issues')
    console.log('- User not found')
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  console.log('🛠️  Specific User Deletion Script')
  console.log('==================================\n')
  
  const args = process.argv.slice(2)
  const email = args[0]
  
  if (!email) {
    console.log('❌ Please provide an email address')
    console.log('Usage: node scripts/delete-specific-user.js user@example.com')
    process.exit(1)
  }
  
  // Safety confirmation
  if (!args.includes('--confirm')) {
    console.log(`⚠️  You are about to delete user: ${email}`)
    console.log('This will permanently remove the user and ALL their data!')
    console.log('')
    console.log('To proceed, run:')
    console.log(`node scripts/delete-specific-user.js ${email} --confirm`)
    process.exit(1)
  }
  
  await deleteUserByEmail(email)
}

main().catch(console.error)