import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

import { AuditLogger } from '@/lib/audit'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const resource = searchParams.get('resource')
    const resourceId = searchParams.get('resourceId')
    const action = searchParams.get('action')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined

    const auditLogs = await AuditLogger.getAuditLogs({
      userId: userId || undefined,
      resource: resource || undefined,
      resourceId: resourceId || undefined,
      action: action || undefined,
      limit,
      offset,
      startDate,
      endDate
    })

    return NextResponse.json(auditLogs)
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const daysToKeep = parseInt(searchParams.get('days') || '90')

    if (daysToKeep < 7) {
      return NextResponse.json(
        { error: 'Cannot delete logs newer than 7 days' },
        { status: 400 }
      )
    }

    const deletedCount = await AuditLogger.cleanupOldLogs(daysToKeep)

    // Log the cleanup action
    await AuditLogger.log({
      userId: session.user.id,
      action: 'CLEANUP',
      resource: 'audit_logs',
      description: `Cleaned up ${deletedCount} audit logs older than ${daysToKeep} days`,
      request
    })

    return NextResponse.json({ deletedCount })
  } catch (error) {
    console.error('Error cleaning up audit logs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}