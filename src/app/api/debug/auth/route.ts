import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    console.log('Debug auth attempt for:', email)

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      console.log('User not found')
      return NextResponse.json({
        success: false,
        message: 'User not found',
        email: email
      })
    }

    console.log('User found:', { 
      id: user.id, 
      email: user.email, 
      hasPassword: !!user.password,
      passwordLength: user.password?.length || 0
    })

    if (!user.password) {
      return NextResponse.json({
        success: false,
        message: 'User has no password set',
        user: { id: user.id, email: user.email }
      })
    }

    // Check password
    const isValid = await bcrypt.compare(password, user.password)
    console.log('Password comparison result:', isValid)

    return NextResponse.json({
      success: isValid,
      message: isValid ? 'Authentication successful' : 'Invalid password',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    })

  } catch (error) {
    console.error('Debug auth error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}