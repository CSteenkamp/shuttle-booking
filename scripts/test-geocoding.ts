import { verifyAddress } from '../src/lib/geocoding'

async function testGeocoding() {
  console.log('🧪 Testing geocoding with Ceres address...\n')

  const testAddresses = [
    'Voortrekker Street, Ceres, Western Cape',
    'Main Road, Ceres',
    'Ceres, Western Cape, South Africa'
  ]

  for (const address of testAddresses) {
    console.log(`\n📍 Testing: ${address}`)
    console.log('─'.repeat(50))

    const result = await verifyAddress(address, 'ZA')

    if (result.success && result.address) {
      console.log('✅ SUCCESS')
      console.log(`   Formatted: ${result.address.formattedAddress}`)
      console.log(`   Coordinates: ${result.address.latitude}, ${result.address.longitude}`)
      console.log(`   Confidence: ${result.address.confidence}`)
      console.log(`   City: ${result.address.components.city || 'N/A'}`)
      console.log(`   Province: ${result.address.components.province || 'N/A'}`)

      if (result.suggestions && result.suggestions.length > 0) {
        console.log(`\n   📋 ${result.suggestions.length} alternative suggestions available`)
      }
    } else {
      console.log('❌ FAILED')
      console.log(`   Error: ${result.error}`)
    }
  }
}

testGeocoding()
  .then(() => {
    console.log('\n\n✨ Geocoding test complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
