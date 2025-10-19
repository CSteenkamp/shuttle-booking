import { verifyAddressGoogle } from '../src/lib/geocoding'

async function testGoogleMaps() {
  console.log('🧪 Testing Google Maps API directly...\n')

  const apiKey = process.env.GOOGLE_MAPS_API_KEY
  console.log(`API Key configured: ${apiKey ? 'Yes' : 'No'}`)
  console.log(`API Key: ${apiKey?.substring(0, 20)}...`)

  const testAddress = 'Ceres, Western Cape, South Africa'
  console.log(`\nTesting address: ${testAddress}\n`)

  const result = await verifyAddressGoogle(testAddress, 'ZA')

  console.log('Result:', JSON.stringify(result, null, 2))
}

testGoogleMaps()
  .then(() => {
    console.log('\n✨ Test complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
