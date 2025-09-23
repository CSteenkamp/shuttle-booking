const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function makeUserAdmin(email) {
  try {
    console.log(`Looking for user with email: ${email}`)
    
    // First, check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, role: true }
    })

    if (!user) {
      console.log(`❌ User with email ${email} not found`)
      console.log('Available users:')
      const allUsers = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true }
      })
      allUsers.forEach(u => {
        console.log(`  - ${u.email} (${u.name || 'No name'}) - Role: ${u.role}`)
      })
      return
    }

    console.log(`✅ Found user: ${user.name || 'No name'} (${user.email})`)
    console.log(`   Current role: ${user.role}`)

    if (user.role === 'ADMIN') {
      console.log('✅ User is already an admin!')
      return
    }

    // Update user role to ADMIN
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
      select: { id: true, name: true, email: true, role: true }
    })

    console.log('🎉 Successfully updated user role!')
    console.log(`   ${updatedUser.name || 'No name'} (${updatedUser.email})`)
    console.log(`   New role: ${updatedUser.role}`)
    console.log('')
    console.log('🔐 You can now access the admin panel by:')
    console.log('   1. Sign in with this account')
    console.log('   2. Look for the "Admin Panel" button in the navigation')
    console.log('   3. Or go directly to /admin')

  } catch (error) {
    console.error('❌ Error updating user role:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Get email from command line argument or use default
const email = process.argv[2] || 'cteenkamp@gmail.com'
makeUserAdmin(email)