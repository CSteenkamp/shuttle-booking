const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function testAuditLogging() {
  console.log('📜 Testing Audit Logging System...\n')
  
  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN' }
  })
  
  if (!admin) {
    console.log('❌ No admin user found for audit testing')
    return
  }
  
  // Test creating various audit log entries
  const auditEntries = [
    {
      userId: admin.id,
      action: 'CREATE',
      resource: 'settings',
      resourceId: 'test_setting',
      description: 'Created new system setting for testing',
      success: true,
      ipAddress: '127.0.0.1',
      userAgent: 'Test Browser',
      method: 'POST',
      path: '/api/admin/settings',
      oldValues: {},
      newValues: { key: 'test_setting', value: 'test_value' }
    },
    {
      userId: admin.id,
      action: 'UPDATE',
      resource: 'users',
      resourceId: admin.id,
      description: 'Updated user profile information',
      success: true,
      ipAddress: '127.0.0.1',
      userAgent: 'Test Browser',
      method: 'PUT',
      path: '/api/admin/users',
      oldValues: { name: 'Old Name' },
      newValues: { name: 'New Name' }
    },
    {
      userId: admin.id,
      action: 'DELETE',
      resource: 'bookings',
      resourceId: 'booking_123',
      description: 'Cancelled booking due to admin override',
      success: true,
      ipAddress: '127.0.0.1',
      userAgent: 'Test Browser',
      method: 'DELETE',
      path: '/api/admin/bookings',
      oldValues: { status: 'CONFIRMED' },
      newValues: { status: 'CANCELLED' }
    },
    {
      userId: admin.id,
      action: 'LOGIN',
      resource: 'auth',
      description: 'Admin user logged into system',
      success: true,
      ipAddress: '192.168.1.100',
      userAgent: 'Mozilla/5.0 (Chrome)',
      method: 'POST',
      path: '/api/auth/signin'
    },
    {
      userId: admin.id,
      action: 'CREATE',
      resource: 'trips',
      resourceId: 'trip_456',
      description: 'Failed to create trip - validation error',
      success: false,
      errorMessage: 'Start time cannot be in the past',
      ipAddress: '127.0.0.1',
      userAgent: 'Test Browser',
      method: 'POST',
      path: '/api/admin/trips',
      newValues: { startTime: '2023-01-01', destination: 'Test Location' }
    }
  ]
  
  let createdCount = 0
  
  for (const entry of auditEntries) {
    try {
      await prisma.auditLog.create({
        data: {
          ...entry,
          oldValues: entry.oldValues ? JSON.stringify(entry.oldValues) : null,
          newValues: entry.newValues ? JSON.stringify(entry.newValues) : null
        }
      })
      createdCount++
      console.log(`✅ Created audit log: ${entry.action} ${entry.resource}`)
    } catch (error) {
      console.error(`❌ Failed to create audit log:`, error.message)
    }
  }
  
  console.log(`\n🎉 Created ${createdCount} audit log entries`)
  
  // Test audit statistics
  const auditStats = {
    totalActions: await prisma.auditLog.count(),
    successfulActions: await prisma.auditLog.count({ where: { success: true } }),
    failedActions: await prisma.auditLog.count({ where: { success: false } }),
    actionsByType: await prisma.auditLog.groupBy({
      by: ['action'],
      _count: { id: true }
    }),
    resourceStats: await prisma.auditLog.groupBy({
      by: ['resource'],
      _count: { id: true }
    })
  }
  
  const successRate = auditStats.totalActions > 0 ? 
    (auditStats.successfulActions / auditStats.totalActions * 100).toFixed(1) : 100
  
  console.log(`\n📊 Audit Statistics:`)
  console.log(`- Total Actions: ${auditStats.totalActions}`)
  console.log(`- Successful Actions: ${auditStats.successfulActions}`)
  console.log(`- Failed Actions: ${auditStats.failedActions}`)
  console.log(`- Success Rate: ${successRate}%`)
  
  console.log(`\n🔍 Actions by Type:`)
  auditStats.actionsByType.forEach(stat => {
    console.log(`  - ${stat.action}: ${stat._count.id}`)
  })
  
  console.log(`\n📁 Resources Tracked:`)
  auditStats.resourceStats.forEach(stat => {
    console.log(`  - ${stat.resource}: ${stat._count.id}`)
  })
  
  // Test retrieving recent audit logs
  const recentLogs = await prisma.auditLog.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { name: true, email: true, role: true }
      }
    }
  })
  
  console.log(`\n📋 Recent Audit Logs:`)
  recentLogs.forEach((log, index) => {
    console.log(`${index + 1}. ${log.action} ${log.resource} by ${log.user.name} (${log.success ? '✅' : '❌'})`)
  })
  
  console.log(`\n✅ Audit logging system is working correctly!`)
}

async function main() {
  try {
    await testAuditLogging()
  } catch (error) {
    console.error('Error testing audit system:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()