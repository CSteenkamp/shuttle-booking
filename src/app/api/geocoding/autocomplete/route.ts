import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/geocoding/autocomplete
 *
 * Provides address autocomplete suggestions using Mapbox Search API
 * Returns formatted addresses with coordinates for easy selection
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const city = searchParams.get('city'); // Optional city to limit search

    if (!query || query.length < 3) {
      return NextResponse.json({
        success: false,
        error: 'Query must be at least 3 characters'
      }, { status: 400 });
    }

    const suggestions = await fetchMapboxSuggestions(query, city);

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
 * Fetch address suggestions from Mapbox Search API
 * Mapbox provides excellent autocomplete with real-time suggestions
 */
async function fetchMapboxSuggestions(query: string, city: string | null = null) {
  const apiKey = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  if (!apiKey) {
    console.error('Mapbox API key not configured');
    return [];
  }

  try {
    // Build search query with city context if provided
    const searchQuery = city ? `${query}, ${city}` : query;

    // Mapbox Geocoding API endpoint
    // Using forward geocoding with autocomplete
    const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json`);

    // Add query parameters
    url.searchParams.append('access_token', apiKey);
    url.searchParams.append('country', 'ZA'); // Limit to South Africa
    url.searchParams.append('limit', '10');
    url.searchParams.append('autocomplete', 'true');
    url.searchParams.append('types', 'address,poi'); // Include addresses and points of interest

    // If city is provided, use it as proximity bias
    if (city) {
      // Add language for better results
      url.searchParams.append('language', 'en');
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error('Mapbox API error:', response.status, response.statusText);
      return [];
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return [];
    }

    // Transform Mapbox results to our format
    return data.features.map((feature: any) => {
      // Extract address components
      const context = feature.context || [];
      const placeContext = context.find((c: any) => c.id.startsWith('place'));
      const postcodeContext = context.find((c: any) => c.id.startsWith('postcode'));
      const regionContext = context.find((c: any) => c.id.startsWith('region'));

      return {
        formattedAddress: feature.place_name,
        latitude: feature.center[1], // Mapbox uses [lng, lat]
        longitude: feature.center[0],
        street: feature.text,
        city: placeContext?.text || city,
        postalCode: postcodeContext?.text,
        region: regionContext?.text,
      };
    });
  } catch (error) {
    console.error('Error fetching Mapbox suggestions:', error);
    return [];
  }
}

