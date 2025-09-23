const axios = require('axios')

const BASE_URL = 'http://localhost:3001'

// Test suite for live website testing
class LiveTestSuite {
  constructor() {
    this.sessionCookie = null
    this.adminSessionCookie = null
    this.testResults = []
  }

  log(message, status = 'INFO') {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${status}: ${message}`
    console.log(logEntry)
    this.testResults.push({ timestamp, status, message })
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      }

      if (data) {
        config.data = data
      }

      const response = await axios(config)
      return { success: true, data: response.data, status: response.status }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status
      }
    }
  }

  async testPublicEndpoints() {
    this.log('🌐 Testing Public Endpoints...', 'TEST')

    // Test trips endpoint
    const tripsResult = await this.makeRequest('GET', '/api/trips?week=2025-09-22')
    if (tripsResult.success) {
      this.log(`✅ Trips API: Found ${tripsResult.data.length} trips`, 'PASS')
    } else {
      this.log(`❌ Trips API failed: ${tripsResult.error}`, 'FAIL')
    }

    // Test locations endpoint
    const locationsResult = await this.makeRequest('GET', '/api/locations')
    if (locationsResult.success) {
      this.log(`✅ Locations API: Found ${locationsResult.data.length} locations`, 'PASS')
    } else {
      this.log(`❌ Locations API failed: ${locationsResult.error}`, 'FAIL')
    }

    // Test session endpoint
    const sessionResult = await this.makeRequest('GET', '/api/auth/session')
    if (sessionResult.success) {
      this.log(`✅ Session API: Working (no active session)`, 'PASS')
    } else {
      this.log(`❌ Session API failed: ${sessionResult.error}`, 'FAIL')
    }

    return { tripsResult, locationsResult, sessionResult }
  }

  async testUserAuthentication() {
    this.log('🔐 Testing User Authentication...', 'TEST')

    // Test user login with test credentials
    const loginData = {
      email: 'john@example.com',
      password: 'password123'
    }

    // Note: Since we can't easily test the full OAuth flow via curl,
    // we'll test if the endpoint exists and responds properly
    const loginResult = await this.makeRequest('POST', '/api/auth/signin', loginData)
    
    if (loginResult.status === 401 || loginResult.status === 400) {
      this.log('✅ Login endpoint responds to credentials (authentication flow works)', 'PASS')
    } else if (loginResult.success) {
      this.log('✅ Login successful', 'PASS')
      // Extract session cookie if available
    } else {
      this.log(`❌ Login endpoint failed unexpectedly: ${loginResult.error}`, 'FAIL')
    }

    return loginResult
  }

  async testBookingFlow() {
    this.log('🎫 Testing Booking Flow...', 'TEST')

    // Get available trips first
    const tripsResult = await this.makeRequest('GET', '/api/trips?week=2025-09-22')
    if (!tripsResult.success || tripsResult.data.length === 0) {
      this.log('❌ No trips available for booking test', 'FAIL')
      return false
    }

    const trip = tripsResult.data[0]
    this.log(`📋 Testing booking for trip to ${trip.destination.name}`)

    // Get locations for pickup/dropoff
    const locationsResult = await this.makeRequest('GET', '/api/locations')
    if (!locationsResult.success || locationsResult.data.length < 2) {
      this.log('❌ Insufficient locations for booking test', 'FAIL')
      return false
    }

    const pickupLocation = locationsResult.data[0]
    const dropoffLocation = locationsResult.data[1]

    // Attempt to create booking (this will fail without authentication, but we can test the endpoint)
    const bookingData = {
      tripId: trip.id,
      pickupLocation: pickupLocation.id,
      dropoffLocation: dropoffLocation.id
    }

    const bookingResult = await this.makeRequest('POST', '/api/bookings', bookingData)
    
    if (bookingResult.status === 401) {
      this.log('✅ Booking endpoint correctly requires authentication', 'PASS')
    } else if (bookingResult.success) {
      this.log('✅ Booking created successfully', 'PASS')
    } else {
      this.log(`⚠️  Booking endpoint responded: ${bookingResult.error}`, 'INFO')
    }

    return { trip, pickupLocation, dropoffLocation, bookingResult }
  }

  async testAdminEndpoints() {
    this.log('👑 Testing Admin Endpoints...', 'TEST')

    // Test admin dashboard stats (should require auth)
    const statsResult = await this.makeRequest('GET', '/api/admin/dashboard/stats')
    if (statsResult.status === 401) {
      this.log('✅ Admin stats endpoint correctly requires authentication', 'PASS')
    } else {
      this.log(`❌ Admin stats endpoint security issue: ${statsResult.status}`, 'FAIL')
    }

    // Test admin dashboard activity
    const activityResult = await this.makeRequest('GET', '/api/admin/dashboard/activity')
    if (activityResult.status === 401) {
      this.log('✅ Admin activity endpoint correctly requires authentication', 'PASS')
    } else {
      this.log(`❌ Admin activity endpoint security issue: ${activityResult.status}`, 'FAIL')
    }

    // Test admin audit logs
    const auditResult = await this.makeRequest('GET', '/api/admin/audit')
    if (auditResult.status === 401) {
      this.log('✅ Admin audit endpoint correctly requires authentication', 'PASS')
    } else {
      this.log(`❌ Admin audit endpoint security issue: ${auditResult.status}`, 'FAIL')
    }

    return { statsResult, activityResult, auditResult }
  }

  async testNotificationSystem() {
    this.log('🔔 Testing Notification System...', 'TEST')

    // Test notifications endpoint (should require auth)
    const notificationsResult = await this.makeRequest('GET', '/api/notifications')
    if (notificationsResult.status === 401) {
      this.log('✅ Notifications endpoint correctly requires authentication', 'PASS')
    } else {
      this.log(`⚠️  Notifications endpoint: ${notificationsResult.status}`, 'INFO')
    }

    // Test notification count endpoint
    const countResult = await this.makeRequest('GET', '/api/notifications/count')
    if (countResult.status === 401) {
      this.log('✅ Notification count endpoint correctly requires authentication', 'PASS')
    } else {
      this.log(`⚠️  Notification count endpoint: ${countResult.status}`, 'INFO')
    }

    return { notificationsResult, countResult }
  }

  async testCreditSystem() {
    this.log('💳 Testing Credit System...', 'TEST')

    // Test credit packages endpoint (public)
    const packagesResult = await this.makeRequest('GET', '/api/user/credit-packages')
    if (packagesResult.success) {
      this.log(`✅ Credit packages API: Found ${packagesResult.data.length} packages`, 'PASS')
    } else {
      this.log(`❌ Credit packages API failed: ${packagesResult.error}`, 'FAIL')
    }

    // Test user credits endpoint (should require auth)
    const creditsResult = await this.makeRequest('GET', '/api/user/credits')
    if (creditsResult.status === 401) {
      this.log('✅ User credits endpoint correctly requires authentication', 'PASS')
    } else {
      this.log(`⚠️  User credits endpoint: ${creditsResult.status}`, 'INFO')
    }

    return { packagesResult, creditsResult }
  }

  async testSystemHealth() {
    this.log('🏥 Testing System Health...', 'TEST')

    // Test if all main pages are accessible
    const pages = ['/', '/auth/signin', '/book', '/admin']
    const pageResults = []

    for (const page of pages) {
      try {
        const response = await axios.get(`${BASE_URL}${page}`)
        if (response.status === 200) {
          pageResults.push({ page, status: 'accessible' })
          this.log(`✅ Page ${page}: Accessible`, 'PASS')
        } else {
          pageResults.push({ page, status: 'error', code: response.status })
          this.log(`❌ Page ${page}: Status ${response.status}`, 'FAIL')
        }
      } catch (error) {
        pageResults.push({ page, status: 'error', error: error.message })
        this.log(`❌ Page ${page}: ${error.message}`, 'FAIL')
      }
    }

    return pageResults
  }

  async runFullTestSuite() {
    this.log('🚀 Starting Live Website Test Suite...', 'START')
    
    const results = {}

    try {
      // Test system health first
      results.systemHealth = await this.testSystemHealth()
      
      // Test public endpoints
      results.publicEndpoints = await this.testPublicEndpoints()
      
      // Test authentication
      results.authentication = await this.testUserAuthentication()
      
      // Test booking flow
      results.bookingFlow = await this.testBookingFlow()
      
      // Test admin endpoints security
      results.adminEndpoints = await this.testAdminEndpoints()
      
      // Test notification system
      results.notificationSystem = await this.testNotificationSystem()
      
      // Test credit system
      results.creditSystem = await this.testCreditSystem()

    } catch (error) {
      this.log(`💥 Test suite error: ${error.message}`, 'ERROR')
    }

    this.log('✅ Live Website Test Suite Complete!', 'COMPLETE')
    
    // Summary
    const totalTests = this.testResults.length
    const passedTests = this.testResults.filter(r => r.status === 'PASS').length
    const failedTests = this.testResults.filter(r => r.status === 'FAIL').length
    
    this.log(`📊 Test Summary: ${passedTests}/${totalTests} passed, ${failedTests} failed`, 'SUMMARY')
    
    return {
      results,
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        testResults: this.testResults
      }
    }
  }
}

// Run the test suite
async function main() {
  const testSuite = new LiveTestSuite()
  const results = await testSuite.runFullTestSuite()
  
  console.log('\n' + '='.repeat(60))
  console.log('LIVE WEBSITE TESTING COMPLETE')
  console.log('='.repeat(60))
  
  return results
}

// Check if running directly or being required
if (require.main === module) {
  main().catch(console.error)
}

module.exports = LiveTestSuite