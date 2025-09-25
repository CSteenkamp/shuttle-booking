import crypto from 'crypto'

export interface PayFastConfig {
  merchantId: string
  merchantKey: string
  passphrase: string
  sandbox: boolean
  returnUrl: string
  cancelUrl: string
  notifyUrl: string
}

export interface PaymentData {
  merchant_id: string
  merchant_key: string
  return_url: string
  cancel_url: string
  notify_url: string
  amount: string
  item_name: string
  item_description?: string
  custom_str1?: string
  custom_str2?: string
  custom_str3?: string
  custom_str4?: string
  custom_str5?: string
  m_payment_id?: string
  passphrase?: string
}

export interface ITNData {
  m_payment_id: string
  pf_payment_id: string
  payment_status: string
  item_name: string
  item_description?: string
  amount_gross: string
  amount_fee: string
  amount_net: string
  custom_str1?: string
  custom_str2?: string
  custom_str3?: string
  custom_str4?: string
  custom_str5?: string
  name_first?: string
  name_last?: string
  email_address?: string
  merchant_id: string
  signature: string
}

/**
 * Get PayFast configuration from environment variables
 */
export function getPayFastConfig(): PayFastConfig {
  const config = {
    merchantId: process.env.PAYFAST_MERCHANT_ID || '',
    merchantKey: process.env.PAYFAST_MERCHANT_KEY || '',
    passphrase: process.env.PAYFAST_PASSPHRASE || '',
    sandbox: process.env.PAYFAST_SANDBOX === 'true',
    returnUrl: process.env.PAYFAST_RETURN_URL || '',
    cancelUrl: process.env.PAYFAST_CANCEL_URL || '',
    notifyUrl: process.env.PAYFAST_NOTIFY_URL || '',
  }

  // Validate required config
  if (!config.merchantId || !config.merchantKey || !config.passphrase) {
    throw new Error('PayFast configuration is incomplete. Please check environment variables.')
  }

  return config
}

/**
 * Generate PayFast signature for payment data
 * PayFast requires data to be URL encoded and sorted alphabetically
 */
export function generateSignature(data: Record<string, string>, passphrase?: string): string {
  // Create a copy of data and exclude signature if it exists
  const dataToSign = { ...data }
  delete dataToSign.signature

  // Add passphrase if provided
  if (passphrase) {
    dataToSign.passphrase = passphrase
  }

  // Sort keys alphabetically and build URL encoded string
  const sortedKeys = Object.keys(dataToSign).sort()
  const signatureData = sortedKeys
    .map(key => {
      const value = dataToSign[key]
      if (value !== undefined && value !== null && value !== '') {
        return `${encodeURIComponent(key)}=${encodeURIComponent(value).replace(/%20/g, '+')}`
      }
      return null
    })
    .filter(Boolean)
    .join('&')

  // Generate MD5 hash
  return crypto.createHash('md5').update(signatureData).digest('hex')
}

/**
 * Verify PayFast signature from ITN data
 */
export function verifySignature(itnData: Record<string, string>, passphrase?: string): boolean {
  if (!itnData.signature) {
    return false
  }

  const receivedSignature = itnData.signature
  const calculatedSignature = generateSignature(itnData, passphrase)
  
  return receivedSignature === calculatedSignature
}

/**
 * Prepare payment data for PayFast
 */
export function preparePaymentData(
  config: PayFastConfig,
  paymentDetails: {
    amount: number
    itemName: string
    itemDescription?: string
    paymentId?: string
    userId?: string
    packageId?: string
  }
): PaymentData {
  const data: PaymentData = {
    merchant_id: config.merchantId,
    merchant_key: config.merchantKey,
    return_url: config.returnUrl,
    cancel_url: config.cancelUrl,
    notify_url: config.notifyUrl,
    amount: paymentDetails.amount.toFixed(2),
    item_name: paymentDetails.itemName,
    item_description: paymentDetails.itemDescription || paymentDetails.itemName,
  }

  // Add custom fields for tracking
  if (paymentDetails.paymentId) {
    data.m_payment_id = paymentDetails.paymentId
  }
  if (paymentDetails.userId) {
    data.custom_str1 = paymentDetails.userId
  }
  if (paymentDetails.packageId) {
    data.custom_str2 = paymentDetails.packageId
  }

  return data
}

/**
 * Generate PayFast form HTML
 */
export function generatePaymentForm(
  paymentData: PaymentData,
  signature: string,
  sandbox: boolean = true
): string {
  const payfastUrl = sandbox 
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process'

  let formFields = ''
  
  // Add all payment data as hidden fields
  Object.entries(paymentData).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      formFields += `<input type="hidden" name="${key}" value="${value}" />\n`
    }
  })

  // Add signature
  formFields += `<input type="hidden" name="signature" value="${signature}" />\n`

  return `
    <form id="payfast-form" action="${payfastUrl}" method="post">
      ${formFields}
      <input type="submit" value="Pay with PayFast" />
    </form>
  `
}

/**
 * Get PayFast payment URL with parameters
 */
export function getPaymentUrl(
  paymentData: PaymentData,
  signature: string,
  sandbox: boolean = true
): string {
  const payfastUrl = sandbox 
    ? 'https://sandbox.payfast.co.za/eng/process'
    : 'https://www.payfast.co.za/eng/process'

  const params = new URLSearchParams()
  
  // Add all payment data as URL parameters
  Object.entries(paymentData).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, value)
    }
  })

  // Add signature
  params.append('signature', signature)

  return `${payfastUrl}?${params.toString()}`
}

/**
 * Validate ITN (Instant Transaction Notification) from PayFast
 */
export async function validateITN(
  itnData: Record<string, string>,
  config: PayFastConfig
): Promise<{ isValid: boolean; error?: string }> {
  try {
    // 1. Verify signature
    if (!verifySignature(itnData, config.passphrase)) {
      return { isValid: false, error: 'Invalid signature' }
    }

    // 2. Verify merchant ID
    if (itnData.merchant_id !== config.merchantId) {
      return { isValid: false, error: 'Invalid merchant ID' }
    }

    // 3. Verify payment status (should be COMPLETE for successful payments)
    if (itnData.payment_status !== 'COMPLETE') {
      return { isValid: false, error: `Payment not complete. Status: ${itnData.payment_status}` }
    }

    // Additional validation can be added here (amount verification, etc.)

    return { isValid: true }
  } catch (error) {
    console.error('Error validating ITN:', error)
    return { isValid: false, error: 'Validation error' }
  }
}

/**
 * Create unique payment ID for PayFast transaction
 */
export function generatePaymentId(): string {
  return `PF_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`
}

/**
 * PayFast payment statuses
 */
export enum PayFastPaymentStatus {
  COMPLETE = 'COMPLETE',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  PENDING = 'PENDING'
}

/**
 * Convert PayFast status to our PaymentStatus enum
 */
export function mapPayFastStatus(payfastStatus: string): 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' {
  switch (payfastStatus) {
    case PayFastPaymentStatus.COMPLETE:
      return 'COMPLETED'
    case PayFastPaymentStatus.FAILED:
      return 'FAILED'
    case PayFastPaymentStatus.CANCELLED:
      return 'CANCELLED'
    case PayFastPaymentStatus.PENDING:
    default:
      return 'PENDING'
  }
}