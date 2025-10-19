import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/geocoding/autocomplete
 *
 * Provides address autocomplete suggestions using geocoding services
 * Returns formatted addresses with coordinates for easy selection
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query || query.length < 3) {
      return NextResponse.json({
        success: false,
        error: 'Query must be at least 3 characters'
      }, { status: 400 });
    }

    const suggestions = await fetchAddressSuggestions(query);

    return NextResponse.json({
      success: true,
      suggestions,
      count: suggestions.length
    });
  } catch (error) {
    console.error('Autocomplete error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch address suggestions'
    }, { status: 500 });
  }
}

/**
 * Fetch address suggestions from multiple geocoding providers
 */
async function fetchAddressSuggestions(query: string) {
  const suggestions: any[] = [];

  // Try Google Maps Geocoding API first (if available)
  if (process.env.GOOGLE_MAPS_API_KEY) {
    try {
      const googleResults = await fetchGoogleSuggestions(query);
      suggestions.push(...googleResults);
    } catch (error) {
      console.log('Google Maps autocomplete failed, trying fallback');
    }
  }

  // If no results from Google, try OpenStreetMap Nominatim
  if (suggestions.length === 0) {
    try {
      const nominatimResults = await fetchNominatimSuggestions(query);
      suggestions.push(...nominatimResults);
    } catch (error) {
      console.log('Nominatim autocomplete failed');
    }
  }

  // Deduplicate and limit results
  return deduplicateSuggestions(suggestions).slice(0, 10);
}

/**
 * Fetch suggestions from Google Maps Geocoding API
 */
async function fetchGoogleSuggestions(query: string) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return [];

  // Add "South Africa" to improve relevance
  const searchQuery = query.includes('South Africa') ? query : `${query}, South Africa`;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${apiKey}&region=za`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== 'OK' || !data.results) {
    return [];
  }

  return data.results.map((result: any) => ({
    formattedAddress: result.formatted_address,
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
    street: result.address_components?.find((c: any) => c.types.includes('route'))?.long_name,
    city: result.address_components?.find((c: any) => c.types.includes('locality'))?.long_name,
    postalCode: result.address_components?.find((c: any) => c.types.includes('postal_code'))?.long_name,
  }));
}

/**
 * Fetch suggestions from OpenStreetMap Nominatim
 */
async function fetchNominatimSuggestions(query: string) {
  // Add "South Africa" to improve relevance
  const searchQuery = query.includes('South Africa') ? query : `${query}, South Africa`;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&countrycodes=za&limit=10&addressdetails=1`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'TjoefTjaf-Shuttle-Booking/1.0'
    }
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();

  return data.map((result: any) => ({
    formattedAddress: result.display_name,
    latitude: parseFloat(result.lat),
    longitude: parseFloat(result.lon),
    street: result.address?.road,
    city: result.address?.city || result.address?.town || result.address?.village,
    postalCode: result.address?.postcode,
  }));
}

/**
 * Remove duplicate suggestions based on formatted address similarity
 */
function deduplicateSuggestions(suggestions: any[]) {
  const seen = new Set<string>();
  const unique: any[] = [];

  for (const suggestion of suggestions) {
    // Normalize address for comparison (lowercase, remove extra spaces)
    const normalized = suggestion.formattedAddress
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(suggestion);
    }
  }

  return unique;
}
