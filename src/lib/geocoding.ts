/**
 * Geocoding & Address Verification Library
 * Validates addresses and provides coordinates
 * Supports multiple providers: Google Maps, Mapbox, OpenStreetMap
 */

export interface AddressComponents {
  streetNumber?: string
  street?: string
  suburb?: string
  city?: string
  province?: string
  postalCode?: string
  country?: string
}

export interface VerifiedAddress {
  formattedAddress: string
  latitude: number
  longitude: number
  components: AddressComponents
  placeId?: string
  isValid: boolean
  confidence: 'high' | 'medium' | 'low'
}

export interface GeocodingResult {
  success: boolean
  address?: VerifiedAddress
  suggestions?: VerifiedAddress[]
  error?: string
}

// ============================================================================
// GOOGLE MAPS GEOCODING
// ============================================================================

/**
 * Verify address using Google Maps Geocoding API
 */
export async function verifyAddressGoogle(
  address: string,
  countryBias: string = 'ZA' // Default to South Africa
): Promise<GeocodingResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    console.warn('Google Maps API key not configured')
    return {
      success: false,
      error: 'Geocoding service not configured'
    }
  }

  try {
    const params = new URLSearchParams({
      address,
      key: apiKey,
      components: `country:${countryBias}`
    })

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?${params}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Google Maps API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.status === 'ZERO_RESULTS') {
      return {
        success: false,
        error: 'Address not found. Please check the address and try again.'
      }
    }

    if (data.status !== 'OK') {
      return {
        success: false,
        error: `Geocoding failed: ${data.status}`
      }
    }

    // Process results
    const results = data.results.map((result: any) =>
      parseGoogleResult(result)
    )

    return {
      success: true,
      address: results[0],
      suggestions: results.slice(1, 5) // Up to 4 additional suggestions
    }
  } catch (error) {
    console.error('Google Maps geocoding error:', error)
    return {
      success: false,
      error: 'Failed to verify address. Please try again.'
    }
  }
}

function parseGoogleResult(result: any): VerifiedAddress {
  const components: AddressComponents = {}

  // Parse address components
  result.address_components.forEach((component: any) => {
    const types = component.types

    if (types.includes('street_number')) {
      components.streetNumber = component.long_name
    }
    if (types.includes('route')) {
      components.street = component.long_name
    }
    if (types.includes('sublocality') || types.includes('neighborhood')) {
      components.suburb = component.long_name
    }
    if (types.includes('locality')) {
      components.city = component.long_name
    }
    if (types.includes('administrative_area_level_1')) {
      components.province = component.long_name
    }
    if (types.includes('postal_code')) {
      components.postalCode = component.long_name
    }
    if (types.includes('country')) {
      components.country = component.short_name
    }
  })

  // Determine confidence based on location_type
  let confidence: 'high' | 'medium' | 'low' = 'medium'
  const locationType = result.geometry.location_type

  if (locationType === 'ROOFTOP') {
    confidence = 'high'
  } else if (locationType === 'RANGE_INTERPOLATED' || locationType === 'GEOMETRIC_CENTER') {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }

  return {
    formattedAddress: result.formatted_address,
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
    components,
    placeId: result.place_id,
    isValid: true,
    confidence
  }
}

// ============================================================================
// MAPBOX GEOCODING (Alternative)
// ============================================================================

/**
 * Verify address using Mapbox Geocoding API
 */
export async function verifyAddressMapbox(
  address: string,
  countryBias: string = 'za'
): Promise<GeocodingResult> {
  const apiKey = process.env.MAPBOX_API_KEY

  if (!apiKey) {
    console.warn('Mapbox API key not configured')
    return {
      success: false,
      error: 'Geocoding service not configured'
    }
  }

  try {
    const encodedAddress = encodeURIComponent(address)
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedAddress}.json?country=${countryBias}&access_token=${apiKey}&limit=5`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Mapbox API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.features || data.features.length === 0) {
      return {
        success: false,
        error: 'Address not found. Please check the address and try again.'
      }
    }

    // Process results
    const results = data.features.map((feature: any) =>
      parseMapboxResult(feature)
    )

    return {
      success: true,
      address: results[0],
      suggestions: results.slice(1)
    }
  } catch (error) {
    console.error('Mapbox geocoding error:', error)
    return {
      success: false,
      error: 'Failed to verify address. Please try again.'
    }
  }
}

function parseMapboxResult(feature: any): VerifiedAddress {
  const components: AddressComponents = {}

  // Parse context for address components
  if (feature.context) {
    feature.context.forEach((item: any) => {
      const id = item.id.split('.')[0]

      switch (id) {
        case 'postcode':
          components.postalCode = item.text
          break
        case 'place':
          components.city = item.text
          break
        case 'region':
          components.province = item.text
          break
        case 'country':
          components.country = item.short_code?.toUpperCase()
          break
        case 'neighborhood':
        case 'locality':
          components.suburb = item.text
          break
      }
    })
  }

  // Parse address from place_name
  if (feature.address) {
    components.streetNumber = feature.address
  }
  if (feature.text) {
    components.street = feature.text
  }

  // Determine confidence based on relevance
  let confidence: 'high' | 'medium' | 'low' = 'medium'
  if (feature.relevance >= 0.9) {
    confidence = 'high'
  } else if (feature.relevance >= 0.7) {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }

  return {
    formattedAddress: feature.place_name,
    latitude: feature.center[1],
    longitude: feature.center[0],
    components,
    placeId: feature.id,
    isValid: true,
    confidence
  }
}

// ============================================================================
// OPENSTREETMAP NOMINATIM (Free Alternative)
// ============================================================================

/**
 * Verify address using OpenStreetMap Nominatim (free, rate-limited)
 */
export async function verifyAddressNominatim(
  address: string,
  countryBias: string = 'za'
): Promise<GeocodingResult> {
  try {
    const params = new URLSearchParams({
      q: address,
      format: 'json',
      addressdetails: '1',
      limit: '5',
      countrycodes: countryBias.toLowerCase()
    })

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        method: 'GET',
        headers: {
          'User-Agent': 'TjoefTjaf-Shuttle-Booking/1.0' // Required by Nominatim
        }
      }
    )

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data || data.length === 0) {
      return {
        success: false,
        error: 'Address not found. Please check the address and try again.'
      }
    }

    // Process results
    const results = data.map((item: any) => parseNominatimResult(item))

    return {
      success: true,
      address: results[0],
      suggestions: results.slice(1)
    }
  } catch (error) {
    console.error('Nominatim geocoding error:', error)
    return {
      success: false,
      error: 'Failed to verify address. Please try again.'
    }
  }
}

function parseNominatimResult(item: any): VerifiedAddress {
  const address = item.address || {}
  const components: AddressComponents = {
    streetNumber: address.house_number,
    street: address.road,
    suburb: address.suburb || address.neighbourhood,
    city: address.city || address.town || address.village,
    province: address.state,
    postalCode: address.postcode,
    country: address.country_code?.toUpperCase()
  }

  // Determine confidence based on type
  let confidence: 'high' | 'medium' | 'low' = 'medium'
  const type = item.type

  if (type === 'house' || type === 'building') {
    confidence = 'high'
  } else if (type === 'street' || type === 'residential') {
    confidence = 'medium'
  } else {
    confidence = 'low'
  }

  return {
    formattedAddress: item.display_name,
    latitude: parseFloat(item.lat),
    longitude: parseFloat(item.lon),
    components,
    placeId: item.place_id?.toString(),
    isValid: true,
    confidence
  }
}

// ============================================================================
// UNIFIED VERIFICATION FUNCTION
// ============================================================================

/**
 * Verify address using configured provider
 * Falls back to alternative providers if primary fails
 */
export async function verifyAddress(
  address: string,
  countryBias: string = 'ZA'
): Promise<GeocodingResult> {
  // Validate input
  if (!address || address.trim().length < 5) {
    return {
      success: false,
      error: 'Please enter a complete address'
    }
  }

  // Try primary provider (Google Maps)
  if (process.env.GOOGLE_MAPS_API_KEY) {
    const result = await verifyAddressGoogle(address, countryBias)
    if (result.success) {
      return result
    }
  }

  // Fallback to Mapbox
  if (process.env.MAPBOX_API_KEY) {
    const result = await verifyAddressMapbox(address, countryBias.toLowerCase())
    if (result.success) {
      return result
    }
  }

  // Last resort: Nominatim (free, rate-limited)
  const result = await verifyAddressNominatim(address, countryBias.toLowerCase())
  if (result.success) {
    return result
  }

  // All providers failed
  return {
    success: false,
    error: 'Unable to verify address. Please check and try again.'
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  return Math.round(distance * 10) / 10 // Round to 1 decimal
}

function toRad(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Check if address is within service area bounds
 */
export function isWithinServiceArea(
  latitude: number,
  longitude: number,
  serviceAreaCenter: { lat: number; lng: number },
  radiusKm: number
): boolean {
  const distance = calculateDistance(
    latitude,
    longitude,
    serviceAreaCenter.lat,
    serviceAreaCenter.lng
  )

  return distance <= radiusKm
}
