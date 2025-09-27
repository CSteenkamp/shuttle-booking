# Production Login & Calendar Issues - Fix Guide

## 🚨 Critical Issues Identified

### 1. **Authentication Configuration Problems**

#### Issue: Cookie Security Settings
- **Problem**: Cookie security was hardcoded to `false` for production
- **Fix**: Updated to use dynamic environment-based security
- **File**: `src/auth.ts` line 66

#### Issue: NEXTAUTH_URL Mismatch
- **Problem**: Development uses port 3001, but template had 3000
- **Fix**: Updated `.env.example` to use correct port 3001
- **Production**: Must be set to `https://tjoeftjaf.xyz`

#### Issue: Debug Logging Disabled
- **Problem**: Hard to diagnose production auth issues
- **Fix**: Enabled debug logging for both environments

### 2. **Calendar Integration Problems**

#### Issue: Missing Calendar Configuration
- **Status**: No Google Calendar settings configured
- **Required Settings** (in admin panel):
  - `google_calendar_service_account` - JSON credentials
  - `google_calendar_id` - Target calendar ID
  - `calendar_sync_enabled` - Enable/disable sync

#### Issue: Service Account Permissions
- **Problem**: Service account likely doesn't have calendar access
- **Fix**: Share calendar with service account email

## 🔧 Immediate Action Required

### 1. **Environment Variables (Production)**
Create `.env.production` with these exact values:

```bash
DATABASE_URL="postgresql://your-production-db-url"
NEXTAUTH_URL="https://tjoeftjaf.xyz"
NEXTAUTH_SECRET="minimum-32-character-secret-here"
EMAIL_USER="your-gmail@gmail.com"
EMAIL_PASS="your-gmail-app-password"
NODE_ENV="production"
```

### 2. **Clear Production Database**
**⚠️ DANGER**: This will delete ALL users!

```bash
# On production server
node scripts/clear-users.js --confirm
```

### 3. **Create Admin Account**
After clearing users:

```bash
# Create test admin
node scripts/diagnose-system.js --create-test-user
```

Or use the signup page to create new admin account.

### 4. **Fix Calendar Integration**

#### Step A: Get Google Service Account
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create/select project
3. Enable Calendar API
4. Create Service Account
5. Download JSON key file

#### Step B: Configure Calendar Access
1. Create/select Google Calendar
2. Share calendar with service account email (from JSON)
3. Give "Make changes to events" permission
4. Copy calendar ID from calendar settings

#### Step C: Add Settings via Admin Panel
1. Go to `/admin/settings`
2. Add these settings:
   - `google_calendar_service_account`: Paste entire JSON content
   - `google_calendar_id`: Calendar ID from Step B
   - `calendar_sync_enabled`: `true`

## 🧪 Testing Scripts Available

### Diagnostic Script
```bash
node scripts/diagnose-system.js --create-test-user
```
- Checks database connectivity
- Verifies environment variables
- Tests calendar settings
- Creates test admin user

### User Cleanup Script
```bash
node scripts/clear-users.js --confirm
```
- Safely removes all users and related data
- Maintains referential integrity
- Shows detailed progress

## 🐛 Common Production Issues

### Login Fails with "Authentication Failed"
1. Check `NEXTAUTH_SECRET` is set and long enough
2. Verify `NEXTAUTH_URL` matches exact domain
3. Clear browser cookies
4. Check server logs for detailed errors

### Login Fails with "Email Not Verified"
1. User created account but didn't verify email
2. Check email configuration is working
3. Manually verify user in database:
   ```sql
   UPDATE "User" SET "emailVerified" = true WHERE email = 'user@example.com';
   ```

### Calendar Events Don't Create
1. Check calendar settings exist in admin panel
2. Verify service account has calendar access
3. Test calendar connection at `/api/calendar/test-connection`
4. Check server logs for Google API errors

## 📊 Production Monitoring

After implementing fixes, monitor these:

1. **Authentication Success Rate**
   - Check failed login attempts
   - Monitor session creation

2. **Calendar Integration Health**
   - Verify events are created
   - Check for API rate limits
   - Monitor error logs

3. **Email Delivery**
   - Verify verification emails are sent
   - Check email service logs

## 🔒 Security Considerations

1. **NEXTAUTH_SECRET**: Must be cryptographically secure
2. **Service Account**: Limit permissions to calendar only
3. **Database**: Use connection pooling and SSL
4. **Email**: Use app passwords, not account passwords

## 📞 Emergency Contacts

If issues persist:
1. Check GitHub Actions deployment logs
2. Verify environment variables are set correctly
3. Test with fresh incognito browser window
4. Check production database connectivity