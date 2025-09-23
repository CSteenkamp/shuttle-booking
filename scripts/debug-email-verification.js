const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function debugEmailVerification() {
  console.log('🔍 Debugging Email Verification System...\n')

  try {
    // Check if any users exist
    const userCount = await prisma.user.count()
    console.log(`Total users in database: ${userCount}`)

    if (userCount > 0) {
      // Get users with verification details
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          emailVerificationToken: true,
          emailVerificationExpires: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })

      console.log('\nRecent users:')
      users.forEach((user, index) => {
        console.log(`\n${index + 1}. User: ${user.email}`)
        console.log(`   ID: ${user.id}`)
        console.log(`   Name: ${user.name || 'Not set'}`)
        console.log(`   Email Verified: ${user.emailVerified ? '✅ Yes' : '❌ No'}`)
        console.log(`   Verification Token: ${user.emailVerificationToken ? 'Present' : 'None'}`)
        console.log(`   Token Expires: ${user.emailVerificationExpires || 'Not set'}`)
        console.log(`   Created: ${user.createdAt}`)
        
        if (user.emailVerificationExpires) {
          const isExpired = new Date(user.emailVerificationExpires) < new Date()
          console.log(`   Token Status: ${isExpired ? '⏰ EXPIRED' : '✅ Valid'}`)
        }
      })

      // Check for unverified users
      const unverifiedUsers = await prisma.user.count({
        where: { emailVerified: false }
      })
      console.log(`\nUnverified users: ${unverifiedUsers}`)

      // Check for expired tokens
      const expiredTokens = await prisma.user.count({
        where: {
          emailVerified: false,
          emailVerificationExpires: {
            lt: new Date()
          }
        }
      })
      console.log(`Users with expired tokens: ${expiredTokens}`)
    }

    // Test with a sample token
    console.log('\n🧪 Testing verification endpoint...')
    
    // Check if we can find a valid verification token
    const userWithToken = await prisma.user.findFirst({
      where: {
        emailVerified: false,
        emailVerificationToken: { not: null },
        emailVerificationExpires: { gt: new Date() }
      }
    })

    if (userWithToken) {
      console.log(`Found user with valid token: ${userWithToken.email}`)
      console.log(`Token: ${userWithToken.emailVerificationToken}`)
      console.log(`You can test verification with: /verify-email?token=${userWithToken.emailVerificationToken}`)
    } else {
      console.log('No users with valid verification tokens found')
    }

  } catch (error) {
    console.error('❌ Error debugging email verification:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugEmailVerification()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })