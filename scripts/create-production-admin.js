const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

async function createProductionAdmin() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔧 Creating Production Admin User')
    console.log('=================================\n')

    // Your credentials - UPDATE THESE BEFORE RUNNING
    const adminEmail = 'christiaan97@icloud.com'
    const adminPassword = process.env.ADMIN_TEMP_PASSWORD || 'AdminPass123!' // Set via environment variable
    const adminName = 'Christiaan Steenkamp'

    if (adminPassword === 'AdminPass123!') {
      console.log('⚠️  Using default password. For security, set ADMIN_TEMP_PASSWORD environment variable.')
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: adminEmail }
    })

    if (existingUser) {
      // Update existing user to admin
      const updatedUser = await prisma.user.update({
        where: { email: adminEmail },
        data: {
          role: 'ADMIN',
          emailVerified: true,
          name: adminName
        }
      })
      console.log(`✅ Updated existing user to admin: ${adminEmail}`)
      console.log(`   Role: ${updatedUser.role}`)
      console.log(`   Verified: ${updatedUser.emailVerified}`)
    } else {
      // Create new admin user
      const hashedPassword = await bcrypt.hash(adminPassword, 12)
      
      const adminUser = await prisma.user.create({
        data: {
          email: adminEmail,
          name: adminName,
          password: hashedPassword,
          role: 'ADMIN',
          emailVerified: true
        }
      })

      // Create credit balance
      await prisma.creditBalance.create({
        data: {
          userId: adminUser.id,
          credits: 0
        }
      })

      console.log(`✅ Created admin user: ${adminEmail}`)
      console.log(`   Password: ${adminPassword}`)
      console.log(`   Role: ADMIN`)
      console.log(`   Verified: Yes`)
    }

    console.log('\n🎉 Admin access ready!')
    console.log(`Login at: https://your-domain.com/auth/signin`)
    console.log(`Email: ${adminEmail}`)
    console.log('⚠️  IMPORTANT: Change your password after first login!')
    console.log('🗑️  You can delete this script after use for security.')
    
  } catch (error) {
    console.error('❌ Error creating admin:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

createProductionAdmin()