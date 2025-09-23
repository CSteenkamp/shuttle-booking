const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function makeUserAdmin() {
  console.log('👑 Making cteenkamp@gmail.com an admin...\n')

  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: 'cteenkamp@gmail.com' }
    })

    if (!user) {
      console.log('❌ User cteenkamp@gmail.com not found')
      return
    }

    console.log(`Found user: ${user.email}`)
    console.log(`Current role: ${user.role}`)
    console.log(`Email verified: ${user.emailVerified}`)

    // Update user to admin role
    const updatedUser = await prisma.user.update({
      where: { email: 'cteenkamp@gmail.com' },
      data: { 
        role: 'ADMIN',
        emailVerified: true // Also verify email while we're at it
      }
    })

    console.log('\n✅ User updated successfully!')
    console.log(`New role: ${updatedUser.role}`)
    console.log(`Email verified: ${updatedUser.emailVerified}`)

    // Check if user has credit balance, create if not
    let creditBalance = await prisma.creditBalance.findUnique({
      where: { userId: user.id }
    })

    if (!creditBalance) {
      creditBalance = await prisma.creditBalance.create({
        data: {
          userId: user.id,
          credits: 1000 // Give admin some initial credits
        }
      })
      console.log(`✅ Created credit balance with 1000 credits`)
    } else {
      console.log(`💰 Current credit balance: ${creditBalance.credits}`)
    }

    console.log('\n🎉 cteenkamp@gmail.com is now an admin with full access!')

  } catch (error) {
    console.error('❌ Error making user admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

makeUserAdmin()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })