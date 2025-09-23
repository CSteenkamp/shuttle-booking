const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function createTestNotifications() {
  console.log('🔔 Creating test notifications...')
  
  const users = await prisma.user.findMany({
    where: { role: 'CUSTOMER' }
  })
  
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  })
  
  if (users.length === 0) {
    console.log('❌ No users found to create notifications for')
    return
  }
  
  let notificationCount = 0
  
  // Create different types of notifications for each user
  const notificationTypes = [
    {
      title: 'Booking Confirmed',
      message: 'Your booking for tomorrow has been confirmed. Please arrive 10 minutes early.',
      type: 'BOOKING_CONFIRMATION',
      priority: 'HIGH'
    },
    {
      title: 'Trip Reminder',
      message: 'Reminder: Your trip to Sandton City starts in 1 hour.',
      type: 'TRIP_REMINDER',
      priority: 'MEDIUM'
    },
    {
      title: 'Payment Confirmed',
      message: 'Your payment has been processed successfully.',
      type: 'PAYMENT_CONFIRMATION',
      priority: 'MEDIUM'
    },
    {
      title: 'System Maintenance',
      message: 'Scheduled maintenance will occur this weekend from 2-4 AM.',
      type: 'SYSTEM_ANNOUNCEMENT',
      priority: 'MEDIUM'
    }
  ]
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    const notificationType = notificationTypes[i % notificationTypes.length]
    
    try {
      await prisma.notification.create({
        data: {
          ...notificationType,
          userId: user.id,
          status: i % 3 === 0 ? 'READ' : 'UNREAD' // Make some read, some unread
        }
      })
      
      notificationCount++
      console.log(`✅ Created notification for ${user.email}: ${notificationType.title}`)
      
    } catch (error) {
      console.error(`❌ Failed to create notification for ${user.email}:`, error.message)
    }
  }
  
  // Create system announcements
  if (admin) {
    const announcements = [
      {
        title: 'New Route Available',
        message: 'We now offer shuttle service to OR Tambo Airport!',
        priority: 'MEDIUM'
      },
      {
        title: 'Holiday Schedule',
        message: 'Please note our modified schedule during the holidays.',
        priority: 'HIGH'
      }
    ]
    
    for (const announcement of announcements) {
      try {
        await prisma.systemAnnouncement.create({
          data: {
            ...announcement,
            active: true,
            createdBy: admin.id
          }
        })
        
        console.log(`✅ Created system announcement: ${announcement.title}`)
        
      } catch (error) {
        console.error(`❌ Failed to create announcement:`, error.message)
      }
    }
  }
  
  // Create notification preferences for users
  for (const user of users) {
    const existingPreferences = await prisma.notificationPreferences.findUnique({
      where: { userId: user.id }
    })
    
    if (!existingPreferences) {
      try {
        await prisma.notificationPreferences.create({
          data: {
            userId: user.id,
            emailEnabled: true,
            bookingConfirmations: true,
            tripReminders: true,
            tripUpdates: true,
            paymentNotifications: true,
            systemAnnouncements: true,
            adminMessages: true,
            smsEnabled: false
          }
        })
        
        console.log(`✅ Created notification preferences for ${user.email}`)
        
      } catch (error) {
        console.error(`❌ Failed to create preferences for ${user.email}:`, error.message)
      }
    }
  }
  
  console.log(`🎉 Created ${notificationCount} notifications`)
  
  // Display summary
  const totalNotifications = await prisma.notification.count()
  const unreadCount = await prisma.notification.count({
    where: { status: 'UNREAD' }
  })
  const announcementCount = await prisma.systemAnnouncement.count()
  
  console.log(`\n📊 Notification Summary:
  - Total notifications: ${totalNotifications}
  - Unread notifications: ${unreadCount}
  - System announcements: ${announcementCount}`)
}

async function main() {
  try {
    await createTestNotifications()
  } catch (error) {
    console.error('Error creating test notifications:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()