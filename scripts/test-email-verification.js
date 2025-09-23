const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testEmailVerification() {
  console.log('🧪 Testing Email Verification Process...\n')

  try {
    // Get the user with a valid token
    const user = await prisma.user.findFirst({
      where: {
        emailVerified: false,
        emailVerificationToken: { not: null },
        emailVerificationExpires: { gt: new Date() }
      }
    })

    if (!user) {
      console.log('❌ No users with valid tokens found for testing')
      return
    }

    console.log(`Testing verification for: ${user.email}`)
    console.log(`Token: ${user.emailVerificationToken}`)
    console.log(`Expires: ${user.emailVerificationExpires}`)

    // Simulate the verification API call
    const token = user.emailVerificationToken

    // Test the verification logic directly
    console.log('\n📋 Testing verification logic...')

    // Check token validity
    if (!token) {
      console.log('❌ No token provided')
      return
    }

    // Find user by token
    const foundUser = await prisma.user.findUnique({
      where: { emailVerificationToken: token }
    })

    if (!foundUser) {
      console.log('❌ User not found with this token')
      return
    }

    // Check expiration
    if (!foundUser.emailVerificationExpires || foundUser.emailVerificationExpires < new Date()) {
      console.log('❌ Token has expired')
      console.log(`Token expires: ${foundUser.emailVerificationExpires}`)
      console.log(`Current time: ${new Date()}`)
      return
    }

    // Check if already verified
    if (foundUser.emailVerified) {
      console.log('❌ Email already verified')
      return
    }

    console.log('✅ All checks passed - token is valid!')

    // Ask if we should actually verify the email
    console.log('\n⚠️  This will verify the email. The verification token will be consumed.')
    console.log('To actually verify, modify this script to perform the update.')
    
    // Uncomment below to actually verify:
    /*
    await prisma.user.update({
      where: { id: foundUser.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null
      }
    })
    console.log('✅ Email verified successfully!')
    */

    console.log('\n🔗 Test URLs:')
    console.log(`GET: http://localhost:3000/api/auth/verify-email?token=${token}`)
    console.log(`Page: http://localhost:3000/verify-email?token=${token}`)

  } catch (error) {
    console.error('❌ Error testing email verification:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testEmailVerification()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })