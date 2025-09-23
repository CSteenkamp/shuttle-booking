import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { 
  NotificationType, 
  NotificationPriority, 
  UserRole 
} from '@prisma/client'

interface CreateNotificationData {
  userId: string
  title: string
  message: string
  type: NotificationType
  priority?: NotificationPriority
  bookingId?: string
  tripId?: string
  data?: Record<string, any>
  actionUrl?: string
  sendEmail?: boolean
}

interface CreateAnnouncementData {
  title: string
  message: string
  priority?: NotificationPriority
  targetRole?: UserRole
  showOnLogin?: boolean
  showInApp?: boolean
  sendEmail?: boolean
  sendSms?: boolean
  expiresAt?: Date
  createdBy: string
}

export class NotificationService {
  // Create a notification for a specific user
  static async createNotification(data: CreateNotificationData) {
    try {
      // Get user notification preferences
      const preferences = await prisma.notificationPreferences.findUnique({
        where: { userId: data.userId },
        include: { user: true }
      })

      // Create default preferences if they don't exist
      if (!preferences) {
        await this.createDefaultPreferences(data.userId)
      }

      // Create the notification in database
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type,
          priority: data.priority || NotificationPriority.MEDIUM,
          bookingId: data.bookingId,
          tripId: data.tripId,
          data: data.data,
          actionUrl: data.actionUrl
        },
        include: {
          user: true,
          booking: {
            include: {
              trip: {
                include: { destination: true }
              }
            }
          },
          trip: {
            include: { destination: true }
          }
        }
      })

      // Send email if requested and user has email notifications enabled
      if (data.sendEmail && preferences?.emailEnabled && this.shouldSendEmailForType(data.type, preferences)) {
        await this.sendNotificationEmail(notification)
      }

      return notification
    } catch (error) {
      console.error('Error creating notification:', error)
      throw error
    }
  }

  // Create system announcement
  static async createAnnouncement(data: CreateAnnouncementData) {
    try {
      const announcement = await prisma.systemAnnouncement.create({
        data: {
          title: data.title,
          message: data.message,
          priority: data.priority || NotificationPriority.MEDIUM,
          targetRole: data.targetRole,
          showOnLogin: data.showOnLogin || false,
          showInApp: data.showInApp !== false, // Default to true
          sendEmail: data.sendEmail || false,
          sendSms: data.sendSms || false,
          expiresAt: data.expiresAt,
          createdBy: data.createdBy
        }
      })

      // Create individual notifications for users if showInApp is true
      if (announcement.showInApp) {
        await this.createAnnouncementNotifications(announcement)
      }

      // Send emails if requested
      if (announcement.sendEmail) {
        await this.sendAnnouncementEmails(announcement)
      }

      return announcement
    } catch (error) {
      console.error('Error creating announcement:', error)
      throw error
    }
  }

  // Get notifications for a user
  static async getUserNotifications(userId: string, options: {
    limit?: number
    offset?: number
    unreadOnly?: boolean
    type?: NotificationType
  } = {}) {
    const where: any = { userId }
    
    if (options.unreadOnly) {
      where.status = 'UNREAD'
    }
    
    if (options.type) {
      where.type = options.type
    }

    return await prisma.notification.findMany({
      where,
      include: {
        booking: {
          include: {
            trip: {
              include: { destination: true }
            }
          }
        },
        trip: {
          include: { destination: true }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      take: options.limit || 50,
      skip: options.offset || 0
    })
  }

  // Mark notification as read
  static async markAsRead(notificationId: string, userId: string) {
    return await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: userId
      },
      data: {
        status: 'READ',
        readAt: new Date()
      }
    })
  }

  // Mark all notifications as read for a user
  static async markAllAsRead(userId: string) {
    return await prisma.notification.updateMany({
      where: {
        userId: userId,
        status: 'UNREAD'
      },
      data: {
        status: 'READ',
        readAt: new Date()
      }
    })
  }

  // Delete notification
  static async deleteNotification(notificationId: string, userId: string) {
    return await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId: userId
      }
    })
  }

  // Get unread count
  static async getUnreadCount(userId: string) {
    return await prisma.notification.count({
      where: {
        userId: userId,
        status: 'UNREAD'
      }
    })
  }

  // Create or update notification preferences
  static async updatePreferences(userId: string, preferences: Partial<{
    emailEnabled: boolean
    bookingConfirmations: boolean
    tripReminders: boolean
    tripUpdates: boolean
    paymentNotifications: boolean
    systemAnnouncements: boolean
    adminMessages: boolean
    smsEnabled: boolean
    smsBookingConfirms: boolean
    smsTripReminders: boolean
    smsTripUpdates: boolean
    smsPaymentNotifs: boolean
    pushEnabled: boolean
    pushBookingConfirms: boolean
    pushTripReminders: boolean
    pushTripUpdates: boolean
    pushPaymentNotifs: boolean
    reminderHours: number
    secondReminderMinutes: number
  }>) {
    return await prisma.notificationPreferences.upsert({
      where: { userId },
      update: preferences,
      create: {
        userId,
        ...preferences
      }
    })
  }

  // Get user preferences
  static async getPreferences(userId: string) {
    let preferences = await prisma.notificationPreferences.findUnique({
      where: { userId }
    })

    if (!preferences) {
      preferences = await this.createDefaultPreferences(userId)
    }

    return preferences
  }

  // Create default preferences for a user
  static async createDefaultPreferences(userId: string) {
    return await prisma.notificationPreferences.create({
      data: { userId }
    })
  }

  // Helper method to check if email should be sent for notification type
  private static shouldSendEmailForType(type: NotificationType, preferences: any): boolean {
    switch (type) {
      case NotificationType.BOOKING_CONFIRMATION:
        return preferences.bookingConfirmations
      case NotificationType.TRIP_REMINDER:
        return preferences.tripReminders
      case NotificationType.TRIP_UPDATE:
        return preferences.tripUpdates
      case NotificationType.PAYMENT_CONFIRMATION:
        return preferences.paymentNotifications
      case NotificationType.SYSTEM_ANNOUNCEMENT:
        return preferences.systemAnnouncements
      case NotificationType.ADMIN_MESSAGE:
        return preferences.adminMessages
      default:
        return true
    }
  }

  // Send email for notification
  private static async sendNotificationEmail(notification: any) {
    try {
      let subject: string
      let content: string

      switch (notification.type) {
        case NotificationType.BOOKING_CONFIRMATION:
          subject = `🎫 Booking Confirmed: ${notification.booking?.trip?.destination?.name || 'Trip'}`
          content = `
            <h2>Your booking has been confirmed!</h2>
            <p>${notification.message}</p>
            ${notification.booking ? `
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Trip Details:</h3>
                <p><strong>Destination:</strong> ${notification.booking.trip.destination.name}</p>
                <p><strong>Date:</strong> ${new Date(notification.booking.trip.startTime).toLocaleDateString()}</p>
                <p><strong>Time:</strong> ${new Date(notification.booking.trip.startTime).toLocaleTimeString()}</p>
                <p><strong>Booking ID:</strong> ${notification.booking.id}</p>
              </div>
            ` : ''}
          `
          break

        case NotificationType.TRIP_REMINDER:
          subject = `🚐 Trip Reminder: ${notification.trip?.destination?.name || 'Upcoming Trip'}`
          content = `
            <h2>Your trip is coming up!</h2>
            <p>${notification.message}</p>
            ${notification.trip ? `
              <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3>Trip Details:</h3>
                <p><strong>Destination:</strong> ${notification.trip.destination.name}</p>
                <p><strong>Departure:</strong> ${new Date(notification.trip.startTime).toLocaleString()}</p>
              </div>
            ` : ''}
          `
          break

        case NotificationType.TRIP_UPDATE:
          subject = `📢 Trip Update: ${notification.trip?.destination?.name || 'Your Trip'}`
          content = `
            <h2>Important update about your trip</h2>
            <p>${notification.message}</p>
          `
          break

        default:
          subject = notification.title
          content = `
            <h2>${notification.title}</h2>
            <p>${notification.message}</p>
          `
      }

      await sendEmail({
        to: notification.user.email,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🚐 ShuttlePro</h1>
            </div>
            <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              ${content}
              ${notification.actionUrl ? `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${notification.actionUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                    View Details
                  </a>
                </div>
              ` : ''}
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 14px;">
                <p>This is an automated message from ShuttlePro.</p>
                <p>You can manage your notification preferences in your account settings.</p>
              </div>
            </div>
          </div>
        `
      })

      // Update notification to mark email as sent
      await prisma.notification.update({
        where: { id: notification.id },
        data: {
          emailSent: true,
          emailSentAt: new Date()
        }
      })
    } catch (error) {
      console.error('Error sending notification email:', error)
    }
  }

  // Create notifications for announcement
  private static async createAnnouncementNotifications(announcement: any) {
    try {
      // Get target users
      const whereClause: any = announcement.targetRole 
        ? { role: announcement.targetRole }
        : {}

      const users = await prisma.user.findMany({
        where: whereClause,
        select: { id: true }
      })

      // Create notifications for each user
      const notifications = users.map(user => ({
        userId: user.id,
        title: announcement.title,
        message: announcement.message,
        type: NotificationType.SYSTEM_ANNOUNCEMENT,
        priority: announcement.priority,
        data: {
          announcementId: announcement.id,
          showOnLogin: announcement.showOnLogin
        }
      }))

      await prisma.notification.createMany({
        data: notifications
      })
    } catch (error) {
      console.error('Error creating announcement notifications:', error)
    }
  }

  // Send announcement emails
  private static async sendAnnouncementEmails(announcement: any) {
    try {
      // Get target users with email preferences
      const whereClause: any = {
        ...(announcement.targetRole ? { role: announcement.targetRole } : {}),
        notificationPreferences: {
          emailEnabled: true,
          systemAnnouncements: true
        }
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          name: true
        }
      })

      // Send emails
      for (const user of users) {
        await sendEmail({
          to: user.email,
          subject: `📢 ShuttlePro Announcement: ${announcement.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🚐 ShuttlePro</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">System Announcement</p>
              </div>
              <div style="background: white; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <h2 style="color: #1e293b; margin-bottom: 20px;">${announcement.title}</h2>
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6; margin: 20px 0;">
                  <p style="margin: 0; line-height: 1.6; color: #334155;">${announcement.message}</p>
                </div>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 14px;">
                  <p>This announcement was sent to all ${announcement.targetRole ? announcement.targetRole.toLowerCase() + 's' : 'users'}.</p>
                  <p>You can manage your notification preferences in your account settings.</p>
                </div>
              </div>
            </div>
          `
        })
      }
    } catch (error) {
      console.error('Error sending announcement emails:', error)
    }
  }
}

// Convenience functions for common notification types
export const createBookingConfirmation = (userId: string, bookingId: string, message: string) =>
  NotificationService.createNotification({
    userId,
    title: 'Booking Confirmed',
    message,
    type: NotificationType.BOOKING_CONFIRMATION,
    priority: NotificationPriority.HIGH,
    bookingId,
    sendEmail: true,
    actionUrl: '/profile'
  })

export const createTripReminder = (userId: string, tripId: string, message: string) =>
  NotificationService.createNotification({
    userId,
    title: 'Trip Reminder',
    message,
    type: NotificationType.TRIP_REMINDER,
    priority: NotificationPriority.HIGH,
    tripId,
    sendEmail: true,
    actionUrl: '/profile'
  })

export const createTripUpdate = (userId: string, tripId: string, title: string, message: string) =>
  NotificationService.createNotification({
    userId,
    title,
    message,
    type: NotificationType.TRIP_UPDATE,
    priority: NotificationPriority.URGENT,
    tripId,
    sendEmail: true,
    actionUrl: '/profile'
  })

export const createPaymentConfirmation = (userId: string, message: string) =>
  NotificationService.createNotification({
    userId,
    title: 'Payment Processed',
    message,
    type: NotificationType.PAYMENT_CONFIRMATION,
    priority: NotificationPriority.MEDIUM,
    sendEmail: true,
    actionUrl: '/profile'
  })