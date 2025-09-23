import { prisma } from '@/lib/prisma'
import { NextRequest } from 'next/server'

interface AuditLogData {
  userId: string
  action: string
  resource: string
  resourceId?: string
  oldValues?: Record<string, unknown>
  newValues?: Record<string, unknown>
  description?: string
  success?: boolean
  errorMessage?: string
  request?: NextRequest
}

export class AuditLogger {
  static async log(data: AuditLogData) {
    try {
      // Extract request context if provided
      let ipAddress: string | undefined
      let userAgent: string | undefined
      let method: string | undefined
      let path: string | undefined

      if (data.request) {
        // Get IP address from headers
        ipAddress = data.request.headers.get('x-forwarded-for') ||
                   data.request.headers.get('x-real-ip') ||
                   data.request.headers.get('cf-connecting-ip') ||
                   'unknown'

        userAgent = data.request.headers.get('user-agent') || undefined
        method = data.request.method
        path = new URL(data.request.url).pathname
      }

      await prisma.auditLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          oldValues: data.oldValues,
          newValues: data.newValues,
          description: data.description,
          success: data.success !== false, // Default to true
          errorMessage: data.errorMessage,
          ipAddress,
          userAgent,
          method,
          path
        }
      })
    } catch (error) {
      // Don't let audit logging failure break the main operation
      console.error('Failed to create audit log:', error)
    }
  }

  // Convenience methods for common audit actions
  static async logCreate(
    userId: string,
    resource: string,
    resourceId: string,
    newValues: Record<string, unknown>,
    request?: NextRequest,
    description?: string
  ) {
    await this.log({
      userId,
      action: 'CREATE',
      resource,
      resourceId,
      newValues,
      description: description || `Created ${resource} ${resourceId}`,
      request
    })
  }

  static async logUpdate(
    userId: string,
    resource: string,
    resourceId: string,
    oldValues: Record<string, unknown>,
    newValues: Record<string, unknown>,
    request?: NextRequest,
    description?: string
  ) {
    await this.log({
      userId,
      action: 'UPDATE',
      resource,
      resourceId,
      oldValues,
      newValues,
      description: description || `Updated ${resource} ${resourceId}`,
      request
    })
  }

  static async logDelete(
    userId: string,
    resource: string,
    resourceId: string,
    oldValues: Record<string, unknown>,
    request?: NextRequest,
    description?: string
  ) {
    await this.log({
      userId,
      action: 'DELETE',
      resource,
      resourceId,
      oldValues,
      description: description || `Deleted ${resource} ${resourceId}`,
      request
    })
  }

  static async logLogin(
    userId: string,
    request?: NextRequest,
    success: boolean = true,
    errorMessage?: string
  ) {
    await this.log({
      userId,
      action: 'LOGIN',
      resource: 'auth',
      description: success ? 'User logged in' : 'Failed login attempt',
      success,
      errorMessage,
      request
    })
  }

  static async logLogout(
    userId: string,
    request?: NextRequest
  ) {
    await this.log({
      userId,
      action: 'LOGOUT',
      resource: 'auth',
      description: 'User logged out',
      request
    })
  }

  static async logSecurityEvent(
    userId: string,
    action: string,
    description: string,
    request?: NextRequest,
    success: boolean = true,
    errorMessage?: string
  ) {
    await this.log({
      userId,
      action,
      resource: 'security',
      description,
      success,
      errorMessage,
      request
    })
  }

  static async logSettingsChange(
    userId: string,
    settingKey: string,
    oldValue: string,
    newValue: string,
    request?: NextRequest
  ) {
    await this.log({
      userId,
      action: 'UPDATE',
      resource: 'settings',
      resourceId: settingKey,
      oldValues: { [settingKey]: oldValue },
      newValues: { [settingKey]: newValue },
      description: `Changed setting ${settingKey} from "${oldValue}" to "${newValue}"`,
      request
    })
  }

  static async logBookingAction(
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    bookingId: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    request?: NextRequest
  ) {
    const descriptions = {
      CREATE: `Created booking ${bookingId}`,
      UPDATE: `Updated booking ${bookingId}`,
      DELETE: `Cancelled booking ${bookingId}`
    }

    await this.log({
      userId,
      action,
      resource: 'bookings',
      resourceId: bookingId,
      oldValues,
      newValues,
      description: descriptions[action],
      request
    })
  }

  static async logTripAction(
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    tripId: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    request?: NextRequest
  ) {
    const descriptions = {
      CREATE: `Created trip ${tripId}`,
      UPDATE: `Updated trip ${tripId}`,
      DELETE: `Deleted trip ${tripId}`
    }

    await this.log({
      userId,
      action,
      resource: 'trips',
      resourceId: tripId,
      oldValues,
      newValues,
      description: descriptions[action],
      request
    })
  }

  static async logUserAction(
    userId: string,
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    targetUserId: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    request?: NextRequest
  ) {
    const descriptions = {
      CREATE: `Created user account ${targetUserId}`,
      UPDATE: `Updated user account ${targetUserId}`,
      DELETE: `Deleted user account ${targetUserId}`
    }

    await this.log({
      userId,
      action,
      resource: 'users',
      resourceId: targetUserId,
      oldValues,
      newValues,
      description: descriptions[action],
      request
    })
  }

  static async logCreditAction(
    userId: string,
    action: 'PURCHASE' | 'USAGE' | 'REFUND' | 'ADMIN_ADJUSTMENT',
    amount: number,
    description: string,
    request?: NextRequest
  ) {
    await this.log({
      userId,
      action,
      resource: 'credits',
      newValues: { amount, type: action },
      description: `${action}: ${description}`,
      request
    })
  }

  // Get audit logs for a specific user or resource
  static async getAuditLogs(options: {
    userId?: string
    resource?: string
    resourceId?: string
    action?: string
    limit?: number
    offset?: number
    startDate?: Date
    endDate?: Date
  }) {
    const where: Record<string, unknown> = {}

    if (options.userId) where.userId = options.userId
    if (options.resource) where.resource = options.resource
    if (options.resourceId) where.resourceId = options.resourceId
    if (options.action) where.action = options.action

    if (options.startDate || options.endDate) {
      where.createdAt = {}
      if (options.startDate) where.createdAt.gte = options.startDate
      if (options.endDate) where.createdAt.lte = options.endDate
    }

    return await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: options.limit || 100,
      skip: options.offset || 0
    })
  }

  // Get audit statistics
  static async getAuditStats(options: {
    startDate?: Date
    endDate?: Date
    userId?: string
  }) {
    const where: Record<string, unknown> = {}

    if (options.userId) where.userId = options.userId

    if (options.startDate || options.endDate) {
      where.createdAt = {}
      if (options.startDate) where.createdAt.gte = options.startDate
      if (options.endDate) where.createdAt.lte = options.endDate
    }

    const [
      totalActions,
      actionsByType,
      resourceStats,
      failedActions,
      userStats
    ] = await Promise.all([
      prisma.auditLog.count({ where }),
      
      prisma.auditLog.groupBy({
        by: ['action'],
        where,
        _count: { action: true }
      }),
      
      prisma.auditLog.groupBy({
        by: ['resource'],
        where,
        _count: { resource: true }
      }),
      
      prisma.auditLog.count({ 
        where: { ...where, success: false } 
      }),
      
      prisma.auditLog.groupBy({
        by: ['userId'],
        where,
        _count: { userId: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 10
      })
    ])

    return {
      totalActions,
      failedActions,
      successRate: totalActions > 0 ? ((totalActions - failedActions) / totalActions) * 100 : 100,
      actionsByType: actionsByType.map(item => ({
        action: item.action,
        count: item._count.action
      })),
      resourceStats: resourceStats.map(item => ({
        resource: item.resource,
        count: item._count.resource
      })),
      topUsers: userStats.map(item => ({
        userId: item.userId,
        actionCount: item._count.userId
      }))
    }
  }

  // Cleanup old audit logs (for maintenance)
  static async cleanupOldLogs(daysToKeep: number = 90) {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    const result = await prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        }
      }
    })

    return result.count
  }
}