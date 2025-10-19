# Mapbox Setup Guide

The address autocomplete feature uses Mapbox's Geocoding API, which provides excellent coverage and real-time suggestions.

## Why Mapbox?

- **Better Coverage**: Comprehensive address data for South Africa
- **Free Tier**: 100,000 free requests per month
- **Real-time Autocomplete**: Suggestions appear as users type
- **Easy Setup**: Just one API token needed

## Setup Instructions

### 1. Create a Mapbox Account

1. Go to https://account.mapbox.com/auth/signup/
2. Sign up with your email (free account is fine)
3. Verify your email address

### 2. Get Your Access Token

1. After logging in, go to https://account.mapbox.com/access-tokens/
2. You'll see a **Default public token** already created
3. Copy this token (it starts with `pk.`)

### 3. Add Token to Your Project

1. Open `.env.local` file in your project root
2. Find the line:
   ```
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="YOUR_MAPBOX_TOKEN_HERE"
   ```
3. Replace `YOUR_MAPBOX_TOKEN_HERE` with your actual token:
   ```
   NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN="pk.eyJ1IjoieW91cnVzZXJuYW1lIiwiYSI6ImNsZjN4eHh4In0.xxxxxx"
   ```

### 4. Restart Your Dev Server

```bash
# Stop the current dev server (Ctrl+C)
npm run dev
```

## Testing

1. Navigate to http://localhost:3000/en/book
2. Select your city (Ceres)
3. Create a new trip
4. Start typing an address in the pickup field
5. You should see autocomplete suggestions appear as you type

## Free Tier Limits

- **100,000 requests/month** (free)
- More than enough for development and small production apps
- Resets monthly

## Pricing (if you exceed free tier)

- After 100,000 requests: $0.50 per 1,000 requests
- Very affordable for most use cases

## Troubleshooting

### No Suggestions Appearing

1. **Check API Token**: Make sure it starts with `pk.` (public token)
2. **Check Console**: Open browser dev tools, look for errors
3. **Token Restrictions**: In Mapbox dashboard, ensure token has no URL restrictions

### API Errors

1. **Check Token**: Verify token is correctly copied (no extra spaces)
2. **Check Network**: Open dev tools → Network tab → Filter by "mapbox"
3. **Check Quota**: Login to Mapbox dashboard to see usage

### Still Not Working?

1. Clear browser cache
2. Restart dev server
3. Check the server logs for error messages
4. Verify `.env.local` file has correct token

## API Documentation

- Mapbox Geocoding: https://docs.mapbox.com/api/search/geocoding/
- Token Management: https://docs.mapbox.com/help/getting-started/access-tokens/

## Security Note

The token is prefixed with `NEXT_PUBLIC_` which means it's safe to expose in client-side code. Mapbox public tokens are designed for this purpose and can be restricted by URL in the Mapbox dashboard if needed.
