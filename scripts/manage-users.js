const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Managing users...')

  try {
    // Remove user Christiaan97@icloud.com
    console.log('1. Removing user Christiaan97@icloud.com...')
    const removedUser = await prisma.user.delete({
      where: { email: 'Christiaan97@icloud.com' }
    }).catch(() => null)
    
    if (removedUser) {
      console.log('✅ User Christiaan97@icloud.com removed successfully')
    } else {
      console.log('ℹ️  User Christiaan97@icloud.com not found (already removed)')
    }

    // Make cteenkamp@gmail.com admin
    console.log('2. Making cteenkamp@gmail.com admin...')
    const adminUser = await prisma.user.update({
      where: { email: 'cteenkamp@gmail.com' },
      data: { role: 'ADMIN' }
    }).catch(() => null)

    if (adminUser) {
      console.log('✅ User cteenkamp@gmail.com is now ADMIN')
    } else {
      console.log('❌ User cteenkamp@gmail.com not found')
    }

    // List all users for verification
    console.log('3. Current users:')
    const users = await prisma.user.findMany({
      select: {
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    })

    users.forEach(user => {
      console.log(`   ${user.email} - ${user.role} - Verified: ${user.emailVerified}`)
    })

  } catch (error) {
    console.error('❌ Error managing users:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()