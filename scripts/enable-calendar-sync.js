const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function enableCalendarSync() {
  console.log('📅 Enabling calendar sync...\n')

  try {
    // Enable calendar sync
    await prisma.settings.upsert({
      where: { key: 'calendar_sync_enabled' },
      update: { 
        value: 'true',
        description: 'Enable Google Calendar synchronization'
      },
      create: { 
        key: 'calendar_sync_enabled',
        value: 'true',
        description: 'Enable Google Calendar synchronization'
      }
    })

    console.log('✅ Calendar sync enabled')

    // Check if Google Calendar credentials exist
    const credentials = await prisma.settings.findMany({
      where: {
        key: { in: ['google_calendar_service_account_key', 'google_calendar_id'] }
      }
    })

    console.log(`📋 Google Calendar credentials: ${credentials.length}/2 configured`)
    
    if (credentials.length < 2) {
      console.log('\n⚠️  Google Calendar credentials missing:')
      console.log('You need to configure:')
      console.log('1. google_calendar_service_account_key')
      console.log('2. google_calendar_id')
      console.log('\nUse the admin settings page to configure these.')
    } else {
      console.log('✅ Google Calendar credentials are configured')
    }

  } catch (error) {
    console.error('❌ Error enabling calendar sync:', error)
  } finally {
    await prisma.$disconnect()
  }
}

enableCalendarSync()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })