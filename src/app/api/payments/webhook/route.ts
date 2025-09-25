import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { 
  getPayFastConfig, 
  validateITN,
  mapPayFastStatus,
  type ITNData
} from '@/lib/payfast'

export async function POST(request: NextRequest) {
  try {
    // Get PayFast configuration
    const config = getPayFastConfig()

    // Parse form data from PayFast ITN
    const formData = await request.formData()
    const itnData: Record<string, string> = {}
    
    formData.forEach((value, key) => {
      itnData[key] = value.toString()
    })

    console.log('[PAYFAST WEBHOOK] Received ITN:', JSON.stringify(itnData, null, 2))

    // Validate the ITN
    const validation = await validateITN(itnData, config)
    
    if (!validation.isValid) {
      console.error('[PAYFAST WEBHOOK] ITN validation failed:', validation.error)
      return NextResponse.json(
        { error: 'Invalid ITN data' },
        { status: 400 }
      )
    }

    // Extract payment details
    const {
      m_payment_id: merchantTxnId,
      pf_payment_id: payfastPaymentId,
      payment_status,
      amount_gross,
      amount_fee,
      amount_net,
      custom_str1: userId,
      custom_str2: packageId,
      item_name,
      merchant_id
    } = itnData

    console.log(`[PAYFAST WEBHOOK] Processing payment: ${merchantTxnId} - Status: ${payment_status} - Amount: R${amount_gross}`)

    // Find the payment transaction
    const paymentTransaction = await prisma.paymentTransaction.findFirst({
      where: {
        merchantTxnId: merchantTxnId,
        status: 'PENDING'
      },
      include: {
        user: true,
        package: true
      }
    })

    if (!paymentTransaction) {
      console.error(`[PAYFAST WEBHOOK] Payment transaction not found: ${merchantTxnId}`)
      return NextResponse.json(
        { error: 'Payment transaction not found' },
        { status: 404 }
      )
    }

    // Map PayFast status to our status enum
    const newStatus = mapPayFastStatus(payment_status)

    // Process payment based on status
    if (payment_status === 'COMPLETE') {
      // Payment successful - add credits to user account
      await prisma.$transaction(async (tx) => {
        // Update payment transaction
        await tx.paymentTransaction.update({
          where: { id: paymentTransaction.id },
          data: {
            status: 'COMPLETED',
            payfastPaymentId: payfastPaymentId,
            itnData: itnData,
            completedAt: new Date()
          }
        })

        // Add credits to user balance
        await tx.creditBalance.upsert({
          where: { userId: paymentTransaction.userId },
          update: {
            credits: {
              increment: paymentTransaction.credits
            }
          },
          create: {
            userId: paymentTransaction.userId,
            credits: paymentTransaction.credits
          }
        })

        // Create credit transaction record
        await tx.creditTransaction.create({
          data: {
            userId: paymentTransaction.userId,
            type: 'PURCHASE',
            amount: paymentTransaction.credits,
            description: `PayFast payment: ${item_name} - Payment ID: ${payfastPaymentId}`
          }
        })

        console.log(`[PAYFAST WEBHOOK] Successfully added ${paymentTransaction.credits} credits to user ${paymentTransaction.userId}`)
      })

      // Send confirmation email (optional - can be implemented later)
      // await sendPaymentConfirmationEmail(paymentTransaction.user.email, {
      //   packageName: paymentTransaction.package?.name || 'Credit Package',
      //   credits: paymentTransaction.credits,
      //   amount: paymentTransaction.amount,
      //   transactionId: payfastPaymentId
      // })

    } else {
      // Payment failed or cancelled
      await prisma.paymentTransaction.update({
        where: { id: paymentTransaction.id },
        data: {
          status: newStatus,
          payfastPaymentId: payfastPaymentId,
          itnData: itnData,
          completedAt: new Date()
        }
      })

      console.log(`[PAYFAST WEBHOOK] Payment ${merchantTxnId} ${payment_status.toLowerCase()} - no credits added`)
    }

    // Return success response to PayFast
    return new NextResponse('OK', { status: 200 })

  } catch (error) {
    console.error('[PAYFAST WEBHOOK] Error processing webhook:', error)
    
    // Return error to PayFast - they will retry
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

// PayFast only sends POST requests for ITN
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. This endpoint only accepts POST requests from PayFast.' },
    { status: 405 }
  )
}