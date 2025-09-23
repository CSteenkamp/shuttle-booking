const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function setDriverEmail() {
  try {
    console.log('🚐 Setting up driver email configuration...')

    // Set driver email in settings
    await prisma.settings.upsert({
      where: { key: 'driver_email' },
      update: { 
        value: 'Christiaan97@icloud.com',
        description: 'Email address for the shuttle driver to receive calendar invites'
      },
      create: { 
        key: 'driver_email',
        value: 'Christiaan97@icloud.com',
        description: 'Email address for the shuttle driver to receive calendar invites'
      }
    })

    // Set driver name in settings
    await prisma.settings.upsert({
      where: { key: 'driver_name' },
      update: { 
        value: 'Christiaan',
        description: 'Name of the shuttle driver'
      },
      create: { 
        key: 'driver_name',
        value: 'Christiaan',
        description: 'Name of the shuttle driver'
      }
    })

    console.log('✅ Driver email: Christiaan97@icloud.com')
    console.log('✅ Driver name: Christiaan')
    console.log('\n🎉 Driver configuration complete!')
    console.log('All calendar invites will now be sent to the driver email address.')

  } catch (error) {
    console.error('❌ Error setting driver email:', error)
  } finally {
    await prisma.$disconnect()
  }
}

setDriverEmail()