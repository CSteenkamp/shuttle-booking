import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'christiaan97@icloud.com'
  const password = 'admin123' // Default password - should be changed after first login
  const hashedPassword = await bcrypt.hash(password, 10)

  // Check if user exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  })

  if (existingUser) {
    // Update existing user to admin
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' }
    })
    console.log('✅ User updated to ADMIN:')
    console.log(`   Email: ${updatedUser.email}`)
    console.log(`   Name: ${updatedUser.name}`)
    console.log(`   Role: ${updatedUser.role}`)
  } else {
    // Create new admin user
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: 'Christiaan Steenkamp',
        role: 'ADMIN',
        emailVerified: true,
        creditBalance: {
          create: {
            credits: 1000
          }
        }
      }
    })
    console.log('✅ Admin user created:')
    console.log(`   Email: ${newUser.email}`)
    console.log(`   Name: ${newUser.name}`)
    console.log(`   Role: ${newUser.role}`)
    console.log(`   Credits: 1000`)
    console.log(`   Password: admin123 (please change after first login)`)
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
