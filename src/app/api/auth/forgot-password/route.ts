import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    // Always return success message for security (don't reveal if email exists)
    const successResponse = NextResponse.json({
      message: 'If an account with that email exists, we\'ve sent you a password reset link.'
    })

    if (!user) {
      return successResponse
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex')
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

    // Hash the reset token before storing
    const hashedResetToken = await hash(resetToken, 12)

    // Store reset token in database
    await prisma.user.update({
      where: { email: email.toLowerCase() },
      data: {
        resetToken: hashedResetToken,
        resetTokenExpiry: resetTokenExpiry
      }
    })

    // Send password reset email
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = nodemailer.createTransporter({
          service: 'gmail',
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
          }
        })

        const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`

        await transporter.sendMail({
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'ShuttlePro - Password Reset',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">🚐 ShuttlePro</h1>
                <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Premium Shuttle Service</p>
              </div>
              
              <div style="padding: 40px 30px; background: white;">
                <h2 style="color: #374151; margin-bottom: 20px;">Password Reset Request</h2>
                
                <p style="color: #6b7280; line-height: 1.6; margin-bottom: 25px;">
                  You requested a password reset for your ShuttlePro account. Click the button below to create a new password:
                </p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" 
                     style="background: linear-gradient(135deg, #4f46e5, #7c3aed); 
                            color: white; 
                            padding: 12px 30px; 
                            text-decoration: none; 
                            border-radius: 8px; 
                            font-weight: bold;
                            display: inline-block;">
                    Reset My Password
                  </a>
                </div>
                
                <p style="color: #9ca3af; font-size: 14px; margin-top: 25px;">
                  This link will expire in 1 hour for security reasons.
                </p>
                
                <p style="color: #9ca3af; font-size: 14px;">
                  If you didn't request this password reset, please ignore this email.
                </p>
              </div>
              
              <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  © 2025 ShuttlePro. All rights reserved.
                </p>
              </div>
            </div>
          `
        })
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError)
        // Don't fail the request if email fails, just log it
      }
    }

    return successResponse

  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}