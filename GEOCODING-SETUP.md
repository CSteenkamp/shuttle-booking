# Address Verification & Geocoding Setup Guide

## Overview
The platform now includes address verification to ensure users enter valid, real addresses. This prevents errors and improves service quality.

**Features:**
- ✅ Real-time address verification
- ✅ Google Maps, Mapbox, or OpenStreetMap support
- ✅ Address suggestions and autocorrection
- ✅ Latitude/longitude coordinates
- ✅ Confidence scoring (high/medium/low)
- ✅ Automatic fallback between providers
- ✅ Beautiful UI with verification badges

---

## Provider Options

### Option 1: Google Maps Geocoding API (Recommended)
**Pros:**
- Most accurate
- Best coverage
- Place IDs for integration with Google Maps
- Excellent for South Africa

**Cons:**
- Requires billing account (has free tier)
- $5 per 1,000 requests after free tier

**Free Tier:**
- $200 monthly credit = ~40,000 geocoding requests/month

---

### Option 2: Mapbox Geocoding API
**Pros:**
- Accurate and fast
- Good free tier
- Modern API
- Great developer experience

**Cons:**
- Requires API key
- Slightly less accurate than Google in some regions

**Free Tier:**
- 100,000 requests/month permanently free

---

### Option 3: OpenStreetMap Nominatim (Free)
**Pros:**
- Completely free
- No API key required
- Open source

**Cons:**
- Rate limited (1 request/second)
- Less accurate
- Requires User-Agent header

**Rate Limits:**
- Max 1 request per second
- Not suitable for high-volume production

---

## Setup Instructions

### 1. Google Maps (Recommended)

#### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Name it: "TjoefTjaf Shuttle Booking"

#### Step 2: Enable Geocoding API
1. Go to **APIs & Services** → **Library**
2. Search for "Geocoding API"
3. Click **Enable**

#### Step 3: Create API Key
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **API Key**
3. Copy the API key

#### Step 4: Restrict API Key (Security)
1. Click on your API key to edit
2. Under **API restrictions**:
   - Select "Restrict key"
   - Check "Geocoding API"
3. Under **Application restrictions**:
   - Choose "HTTP referrers" for web
   - Add your domain: `yourdomain.com/*`
   - Add localhost for dev: `localhost:3000/*`
4. Save

#### Step 5: Add to Environment Variables
```bash
# .env.local
GOOGLE_MAPS_API_KEY=your_api_key_here
```

#### Step 6: Enable Billing (Required)
1. Go to **Billing** in Google Cloud Console
2. Add payment method
3. **Don't worry:** You get $200 free credit monthly
4. Set up budget alerts at $50 and $100

---

### 2. Mapbox Setup

#### Step 1: Create Mapbox Account
1. Go to [Mapbox](https://www.mapbox.com/)
2. Sign up for free account

#### Step 2: Get API Key
1. Go to [Account](https://account.mapbox.com/)
2. Copy your **Default Public Token**
3. Or create new token with Geocoding scope

#### Step 3: Add to Environment Variables
```bash
# .env.local
MAPBOX_API_KEY=your_mapbox_token_here
```

---

### 3. OpenStreetMap Nominatim (No Setup)

No API key required! Works out of the box with rate limits.

Just ensure you have a proper User-Agent set (already configured in code).

---

## Environment Variables

Add to your `.env.local` file:

```bash
# Geocoding Provider (choose one or multiple for fallback)

# Google Maps (Primary - Recommended)
GOOGLE_MAPS_API_KEY=AIzaSyC...your_key_here

# Mapbox (Fallback - Optional)
MAPBOX_API_KEY=pk.eyJ1...your_token_here

# OpenStreetMap Nominatim (Auto-fallback if above not set)
# No key needed - works automatically

# Note: The system will try providers in this order:
# 1. Google Maps (if key exists)
# 2. Mapbox (if key exists)
# 3. OpenStreetMap Nominatim (always available)
```

---

## Usage Examples

### Basic Usage in Forms

```typescript
import AddressInput from '@/components/AddressInput'

function MyForm() {
  const [address, setAddress] = useState('')
  const [coordinates, setCoordinates] = useState<{lat: number, lng: number} | null>(null)

  const handleVerified = (verifiedAddress) => {
    // Address was verified successfully
    setAddress(verifiedAddress.formattedAddress)
    setCoordinates({
      lat: verifiedAddress.latitude,
      lng: verifiedAddress.longitude
    })

    // Save to database with coordinates
  }

  return (
    <AddressInput
      value={address}
      onChange={setAddress}
      onVerified={handleVerified}
      label="Pickup Address"
      placeholder="123 Main Street, Stellenbosch, Western Cape"
      required
      showVerification={true}
    />
  )
}
```

### Auto-Verify (Background)

```typescript
import { SimpleAddressInput } from '@/components/AddressInput'

function QuickForm() {
  return (
    <SimpleAddressInput
      value={address}
      onChange={setAddress}
      onVerified={(addr) => console.log('Verified:', addr)}
      label="Address"
    />
  )
}
```

### Manual Verification

```typescript
import { verifyAddress } from '@/lib/geocoding'

async function checkAddress(address: string) {
  const result = await verifyAddress(address, 'ZA')

  if (result.success) {
    console.log('Address:', result.address.formattedAddress)
    console.log('Coordinates:', result.address.latitude, result.address.longitude)
    console.log('Confidence:', result.address.confidence)
  }
}
```

---

## Integration Points

### 1. Trip Booking (Custom Destinations)
**File:** `src/app/[locale]/book/page.tsx`

Replace custom destination input with:
```typescript
<AddressInput
  value={customDestination}
  onChange={setCustomDestination}
  onVerified={handleDestinationVerified}
  label="Destination Address"
  required
/>
```

### 2. Saved Addresses
**File:** `src/app/[locale]/profile/page.tsx`

When adding new saved address:
```typescript
<AddressInput
  value={newAddress}
  onChange={setNewAddress}
  onVerified={(addr) => {
    setNewAddressCoords({
      lat: addr.latitude,
      lng: addr.longitude
    })
  }}
  label="Address"
  placeholder="Home, Work, etc."
  required
/>
```

### 3. Driver Application
**File:** `src/app/[locale]/driver/apply/page.tsx`

For driver's address:
```typescript
<AddressInput
  value={driverAddress}
  onChange={setDriverAddress}
  onVerified={handleAddressVerified}
  label="Residential Address"
  required
/>
```

---

## Database Updates

The `SavedAddress` model already has `latitude` and `longitude` fields:

```prisma
model SavedAddress {
  id          String   @id @default(cuid())
  userId      String
  name        String   // e.g., "Home", "Work"
  address     String   // Full address text
  latitude    Float?   // ✅ Already exists
  longitude   Float?   // ✅ Already exists
  // ...
}
```

Update your save functions to include coordinates:

```typescript
await prisma.savedAddress.create({
  data: {
    userId: user.id,
    name: addressName,
    address: verifiedAddress.formattedAddress,
    latitude: verifiedAddress.latitude,
    longitude: verifiedAddress.longitude,
    isDefault: false
  }
})
```

---

## API Reference

### POST /api/geocoding/verify

**Request:**
```json
{
  "address": "123 Main Street, Stellenbosch, Western Cape",
  "countryBias": "ZA"  // Optional, defaults to "ZA"
}
```

**Response (Success):**
```json
{
  "success": true,
  "address": {
    "formattedAddress": "123 Main St, Stellenbosch Central, Stellenbosch, 7600, South Africa",
    "latitude": -33.9321,
    "longitude": 18.8602,
    "components": {
      "streetNumber": "123",
      "street": "Main Street",
      "suburb": "Stellenbosch Central",
      "city": "Stellenbosch",
      "province": "Western Cape",
      "postalCode": "7600",
      "country": "ZA"
    },
    "confidence": "high",
    "isValid": true
  },
  "suggestions": [
    // Additional address matches
  ]
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Address not found. Please check the address and try again."
}
```

---

## Cost Estimation

### Google Maps Pricing

**Geocoding API:**
- $5 per 1,000 requests
- Monthly free credit: $200 = 40,000 requests

**Typical Usage:**
- New trip with custom destination: 1 request
- Saved address creation: 1 request
- Driver application: 1 request

**Estimated Monthly Costs:**
- 100 bookings/day × 30 days × 50% custom = 1,500 requests
- 50 new users/month saving addresses = 100 requests
- 20 driver applications/month = 20 requests
- **Total: ~1,620 requests/month = FREE**

Even at 10x scale (16,200 requests), cost = ~$21/month

---

## Testing

### Test Addresses (South Africa)

```
Valid Addresses:
✅ "1 Church Street, Stellenbosch, Western Cape"
✅ "123 Long Street, Cape Town, 8001"
✅ "45 Nelson Mandela Drive, Johannesburg"

Invalid Addresses:
❌ "asdfasdf" → Returns error
❌ "123" → Returns error (too short)
❌ "Mars Colony 7" → Returns error (not found)
```

### Manual Testing

1. Start dev server: `npm run dev`
2. Go to trip booking page
3. Enter custom destination
4. Click "Verify"
5. Check console for geocoding results
6. Verify coordinates are saved

---

## Troubleshooting

### "Geocoding service not configured"
- Missing API keys
- Add at least one: `GOOGLE_MAPS_API_KEY` or `MAPBOX_API_KEY`
- Or rely on Nominatim (no key needed)

### "Failed to fetch from Google Fonts" (Build Error)
- Unrelated to geocoding
- Network timeout fetching fonts
- Retry build or configure font loading

### "Address not found"
- User entered incomplete/invalid address
- Try with more details (street number, suburb, city)
- Suggestions will show if close matches found

### "Rate limit exceeded" (Nominatim)
- Using OSM without API key
- Limited to 1 request/second
- Add Google Maps or Mapbox API key
- Or implement request queuing

### API Key Not Working
- Check restrictions on key
- Ensure Geocoding API is enabled
- Verify billing is set up (Google)
- Check key hasn't expired

---

## Security Best Practices

### API Key Security

1. **Never commit API keys to git**
   ```bash
   # .gitignore (already configured)
   .env.local
   .env*.local
   ```

2. **Use environment variables**
   ```bash
   # Production (Vercel)
   Settings → Environment Variables → Add
   ```

3. **Restrict API keys**
   - Domain restrictions
   - API restrictions
   - Usage quotas

4. **Monitor usage**
   - Set up billing alerts
   - Review usage weekly
   - Watch for anomalies

### Server-Side Only

The geocoding happens server-side only (in API routes), so API keys are never exposed to the client.

---

## Future Enhancements

### Phase 3 Possibilities:
- **Address autocomplete** - As user types
- **Place search** - "Nearest Spar" → Address
- **Reverse geocoding** - GPS → Address
- **Distance matrix** - Calculate drive times
- **Route optimization** - Best route for multiple pickups
- **Geofencing** - Automatic area detection

---

## Quick Start Checklist

For immediate setup with Google Maps:

- [ ] Create Google Cloud project
- [ ] Enable Geocoding API
- [ ] Create & restrict API key
- [ ] Add to `.env.local`: `GOOGLE_MAPS_API_KEY=...`
- [ ] Enable billing (free tier sufficient)
- [ ] Set budget alert at $50
- [ ] Test with address verification
- [ ] Deploy to production
- [ ] Add environment variable in Vercel
- [ ] Monitor usage in Google Cloud Console

**Estimated setup time:** 15 minutes

---

## Support

**Google Maps API Issues:**
- [Documentation](https://developers.google.com/maps/documentation/geocoding)
- [Support](https://support.google.com/googleapi)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/google-maps-api)

**Mapbox Issues:**
- [Documentation](https://docs.mapbox.com/api/search/geocoding/)
- [Support](https://support.mapbox.com/)

**Code Issues:**
- Check `src/lib/geocoding.ts` for implementation
- Review `src/components/AddressInput.tsx` for UI
- Test API at `/api/geocoding/verify`

---

**Status:** ✅ Ready for production
**Providers:** Google Maps, Mapbox, OpenStreetMap
**Default:** Automatic fallback between providers

Address verification is now a core part of the platform! 🎯
