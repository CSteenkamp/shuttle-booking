import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendEmailVerification } from '@/lib/email'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, password, riders = [] } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase()

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists with this email' },
        { status: 409 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Create user with riders in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name,
          email: normalizedEmail,
          phone,
          password: hashedPassword,
          role: 'CUSTOMER',
          emailVerified: false,
          emailVerificationToken: verificationToken,
          emailVerificationExpires: expiresAt,
        }
      })

      // Create initial credit balance
      await tx.creditBalance.create({
        data: {
          userId: user.id,
          credits: 0,
        }
      })

      // Create riders if provided
      if (riders.length > 0) {
        interface RiderInput {
          name: string;
          phone?: string;
          relationship?: string;
          dateOfBirth?: { year: number; month: number; day: number };
          medicalInfo?: string;
          emergencyContact?: string;
          notes?: string;
        }

        const validRiders = riders
          .filter((rider: RiderInput) => rider.name && rider.name.trim() !== '')
          .slice(0, 8) // Limit to 8 riders
          .map((rider: RiderInput) => ({
            userId: user.id,
            name: rider.name.trim(),
            phone: rider.phone?.trim() || null,
            relationship: rider.relationship || 'Child',
            dateOfBirth: rider.dateOfBirth ? new Date(rider.dateOfBirth.year, rider.dateOfBirth.month - 1, rider.dateOfBirth.day) : null,
            medicalInfo: rider.medicalInfo?.trim() || null,
            emergencyContact: rider.emergencyContact?.trim() || null,
            notes: rider.notes?.trim() || null,
          }))

        if (validRiders.length > 0) {
          await tx.rider.createMany({
            data: validRiders
          })
        }
      }

      return user
    })

    // Send verification email
    try {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
      const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`

      await sendEmailVerification({
        userEmail: normalizedEmail,
        userName: name,
        verificationToken,
        verificationUrl
      })

      console.log(`Email verification sent to ${normalizedEmail}`)
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError)
      // Don't fail registration if email fails, just log the error
    }

    return NextResponse.json({
      message: 'User created successfully. Please check your email to verify your account.',
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
        role: result.role,
        emailVerified: false,
      },
      requiresVerification: true
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}