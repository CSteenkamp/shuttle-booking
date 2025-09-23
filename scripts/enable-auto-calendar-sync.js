const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function enableAutoCalendarSyncForAllUsers() {
  try {
    console.log('🔄 Enabling auto calendar sync for all users...')

    // Get all users
    const users = await prisma.user.findMany({
      select: { id: true, email: true }
    })

    console.log(`Found ${users.length} users`)

    for (const user of users) {
      await prisma.settings.upsert({
        where: { key: `auto_calendar_sync_${user.id}` },
        update: { 
          value: 'true',
          description: `Auto calendar sync setting for user ${user.email}`
        },
        create: { 
          key: `auto_calendar_sync_${user.id}`,
          value: 'true',
          description: `Auto calendar sync setting for user ${user.email}`
        }
      })
      console.log(`✅ Enabled auto calendar sync for ${user.email}`)
    }

    console.log('\n🎉 Auto calendar sync enabled for all users!')
    console.log('All new shuttle bookings will now automatically be added to users\' calendars.')

  } catch (error) {
    console.error('❌ Error enabling auto calendar sync:', error)
  } finally {
    await prisma.$disconnect()
  }
}

enableAutoCalendarSyncForAllUsers()