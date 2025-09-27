#!/usr/bin/env node

/**
 * System Diagnostic Script
 * 
 * This script checks authentication, database, and calendar integration
 * to identify issues preventing login and calendar functionality.
 */

const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function checkDatabase() {
  console.log('📊 Database Connectivity Check')
  console.log('==============================')
  
  try {
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Database connection successful')
    
    // Check user count
    const userCount = await prisma.user.count()
    console.log(`📋 Total users: ${userCount}`)
    
    // Check for users with email verification issues
    const unverifiedUsers = await prisma.user.count({
      where: { emailVerified: false }
    })
    console.log(`❌ Unverified users: ${unverifiedUsers}`)
    
    // Check admin users
    const adminUsers = await prisma.user.count({
      where: { role: 'ADMIN' }
    })
    console.log(`👑 Admin users: ${adminUsers}`)
    
    // Sample user data (first 3, email and verification status only)
    const sampleUsers = await prisma.user.findMany({
      take: 3,
      select: {
        id: true,
        email: true,
        emailVerified: true,
        role: true,
        createdAt: true
      }
    })
    
    console.log('\n📄 Sample Users:')
    sampleUsers.forEach(user => {
      console.log(`   ${user.email} - ${user.emailVerified ? '✅ Verified' : '❌ Unverified'} - ${user.role}`)
    })
    
  } catch (error) {
    console.error('❌ Database error:', error.message)
  }
}

async function checkCalendarSettings() {
  console.log('\n📅 Calendar Integration Check')
  console.log('=============================')
  
  try {
    // Check calendar-related settings
    const calendarSettings = await prisma.settings.findMany({
      where: {
        key: {
          in: [
            'google_calendar_service_account',
            'google_calendar_id',
            'google_calendar_impersonate_email',
            'calendar_sync_enabled'
          ]
        }
      }
    })
    
    const settingsMap = {}
    calendarSettings.forEach(setting => {
      settingsMap[setting.key] = setting.value
    })
    
    console.log('🔧 Calendar Settings:')
    console.log(`   Calendar Sync Enabled: ${settingsMap.calendar_sync_enabled || '❌ Not set'}`)
    console.log(`   Google Calendar ID: ${settingsMap.google_calendar_id ? '✅ Set' : '❌ Missing'}`)
    console.log(`   Service Account: ${settingsMap.google_calendar_service_account ? '✅ Set' : '❌ Missing'}`)
    console.log(`   Impersonate Email: ${settingsMap.google_calendar_impersonate_email || '❌ Not set'}`)
    
    // Try to parse service account if it exists
    if (settingsMap.google_calendar_service_account) {
      try {
        const serviceAccount = JSON.parse(settingsMap.google_calendar_service_account)
        console.log(`   Service Account Email: ${serviceAccount.client_email || '❌ Invalid format'}`)
        console.log(`   Project ID: ${serviceAccount.project_id || '❌ Missing'}`)
      } catch (error) {
        console.log('   ❌ Service Account JSON is invalid')
      }
    }
    
  } catch (error) {
    console.error('❌ Calendar settings error:', error.message)
  }
}

async function checkEnvironmentConfig() {
  console.log('\n🌍 Environment Configuration Check')
  console.log('==================================')
  
  const requiredVars = {
    'DATABASE_URL': process.env.DATABASE_URL,
    'NEXTAUTH_SECRET': process.env.NEXTAUTH_SECRET,
    'NEXTAUTH_URL': process.env.NEXTAUTH_URL,
    'NODE_ENV': process.env.NODE_ENV
  }
  
  const optionalVars = {
    'EMAIL_USER': process.env.EMAIL_USER,
    'EMAIL_PASS': process.env.EMAIL_PASS,
    'CRON_SECRET': process.env.CRON_SECRET
  }
  
  console.log('🔐 Required Variables:')
  Object.entries(requiredVars).forEach(([key, value]) => {
    if (value) {
      // Show partial value for security
      const displayValue = key === 'DATABASE_URL' 
        ? value.split('@')[1] || value.substring(0, 20) + '...'
        : key.includes('SECRET') 
        ? '***' + value.slice(-4)
        : value
      console.log(`   ✅ ${key}: ${displayValue}`)
    } else {
      console.log(`   ❌ ${key}: Not set`)
    }
  })
  
  console.log('\n📧 Optional Variables:')
  Object.entries(optionalVars).forEach(([key, value]) => {
    console.log(`   ${value ? '✅' : '❌'} ${key}: ${value ? 'Set' : 'Not set'}`)
  })
}

async function generateTestUser() {
  console.log('\n👤 Test User Generation')
  console.log('=======================')
  
  const testEmail = 'admin@tjoeftjaf.com'
  
  try {
    // Check if test user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: testEmail }
    })
    
    if (existingUser) {
      console.log(`⚠️  Test user ${testEmail} already exists`)
      console.log(`   Verified: ${existingUser.emailVerified ? 'Yes' : 'No'}`)
      console.log(`   Role: ${existingUser.role}`)
      return
    }
    
    // Create test user
    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash('test123', 12)
    
    const testUser = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'Test Admin',
        password: hashedPassword,
        role: 'ADMIN',
        emailVerified: true // Pre-verify for testing
      }
    })
    
    console.log(`✅ Created test user: ${testEmail}`)
    console.log(`   Password: test123`)
    console.log(`   Role: ADMIN`)
    console.log(`   Pre-verified: Yes`)
    
  } catch (error) {
    console.error('❌ Failed to create test user:', error.message)
  }
}

async function main() {
  console.log('🔍 Tjoef-Tjaf System Diagnostic')
  console.log('===============================\n')
  
  await checkEnvironmentConfig()
  await checkDatabase()
  await checkCalendarSettings()
  
  // Ask if user wants to create test user
  const args = process.argv.slice(2)
  if (args.includes('--create-test-user')) {
    await generateTestUser()
  } else {
    console.log('\n💡 To create a test admin user, run:')
    console.log('   node scripts/diagnose-system.js --create-test-user')
  }
  
  console.log('\n🔧 Recommendations:')
  console.log('==================')
  console.log('1. If login fails, check NEXTAUTH_SECRET and NEXTAUTH_URL')
  console.log('2. If calendar fails, verify Google Calendar settings in admin panel')
  console.log('3. Clear browser cookies and try incognito mode')
  console.log('4. Check server logs for detailed error messages')
  
  await prisma.$disconnect()
}

main().catch(console.error)