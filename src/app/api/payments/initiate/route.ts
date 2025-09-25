import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { 
  getPayFastConfig, 
  preparePaymentData, 
  generateSignature, 
  generatePaymentId,
  getPaymentUrl
} from '@/lib/payfast'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { packageId } = await request.json()

    if (!packageId) {
      return NextResponse.json(
        { error: 'Package ID is required' },
        { status: 400 }
      )
    }

    // Get credit package details
    const creditPackage = await prisma.creditPackage.findUnique({
      where: { id: packageId, isActive: true }
    })

    if (!creditPackage) {
      return NextResponse.json(
        { error: 'Credit package not found or inactive' },
        { status: 404 }
      )
    }

    // Check if user is suspended
    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (user?.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Account suspended. Please contact support.' },
        { status: 403 }
      )
    }

    // Generate unique payment ID
    const merchantTxnId = generatePaymentId()

    // Create payment transaction record
    const paymentTransaction = await prisma.paymentTransaction.create({
      data: {
        userId: session.user.id,
        packageId: creditPackage.id,
        amount: creditPackage.price,
        credits: creditPackage.credits,
        merchantTxnId: merchantTxnId,
        status: 'PENDING'
      }
    })

    // Get PayFast configuration
    const config = getPayFastConfig()

    // Prepare payment data
    const paymentData = preparePaymentData(config, {
      amount: creditPackage.price,
      itemName: `Credit Package: ${creditPackage.name}`,
      itemDescription: `${creditPackage.credits} credits for ${creditPackage.name}`,
      paymentId: merchantTxnId,
      userId: session.user.id,
      packageId: creditPackage.id
    })

    // Generate signature
    const signature = generateSignature(paymentData, config.passphrase)

    // Store signature for verification
    await prisma.paymentTransaction.update({
      where: { id: paymentTransaction.id },
      data: { signature: signature }
    })

    // Generate PayFast payment URL
    const paymentUrl = getPaymentUrl(paymentData, signature, config.sandbox)

    // Log payment initiation for audit trail
    console.log(`[PAYMENT INITIATION] User ${session.user.id} initiated payment for ${creditPackage.name} - Amount: R${creditPackage.price} - Payment ID: ${merchantTxnId}`)

    return NextResponse.json({
      success: true,
      paymentId: paymentTransaction.id,
      merchantTxnId: merchantTxnId,
      paymentUrl: paymentUrl,
      package: {
        id: creditPackage.id,
        name: creditPackage.name,
        credits: creditPackage.credits,
        price: creditPackage.price
      }
    })

  } catch (error) {
    console.error('Error initiating payment:', error)
    return NextResponse.json(
      { error: 'Failed to initiate payment. Please try again.' },
      { status: 500 }
    )
  }
}