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
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined

    const stats = await AuditLogger.getAuditStats({
      userId: userId || undefined,
      startDate,
      endDate
    })

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching audit stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}