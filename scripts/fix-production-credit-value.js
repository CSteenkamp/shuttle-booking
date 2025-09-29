#!/usr/bin/env node

// Production script to fix creditValue setting from R25 to R1
// This will eliminate the "Save R12000" calculations

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function fixProductionCreditValue() {
  console.log('🔧 Fixing creditValue setting on PRODUCTION...')
  
  // Safety check - ensure we're not accidentally running on development
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set')
    console.error('❌ Please set your production DATABASE_URL environment variable')
    process.exit(1)
  }
  
  if (databaseUrl.includes('localhost') || databaseUrl.includes('dev')) {
    console.error('❌ This script should only be run on PRODUCTION')
    console.error('❌ Current DATABASE_URL appears to be development:', databaseUrl.substring(0, 50) + '...')
    process.exit(1)
  }

  try {
    // Check current creditValue setting
    const currentSetting = await prisma.settings.findUnique({
      where: { key: 'creditValue' }
    })
    
    console.log('Current creditValue setting:', currentSetting)

    // Update creditValue to R1 to match package pricing
    const result = await prisma.settings.upsert({
      where: { key: 'creditValue' },
      update: { value: '1' },
      create: { 
        key: 'creditValue', 
        value: '1', 
        description: 'Cost per credit in South African Rand' 
      }
    })

    console.log('✅ Updated creditValue setting:', result)
    console.log('✅ creditValue is now R1 (matching package pricing)')
    console.log('✅ This should eliminate the "Save R12000" calculations')

  } catch (error) {
    console.error('❌ Error fixing production creditValue:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Confirm this is intentional production run
console.log('⚠️  PRODUCTION SCRIPT - This will modify your live database')
console.log('⚠️  Make sure your DATABASE_URL points to production')
console.log('⚠️  This fixes the creditValue setting from R25 to R1')
console.log('⚠️  Press Ctrl+C to cancel, or wait 5 seconds to continue...')

setTimeout(() => {
  fixProductionCreditValue()
}, 5000)