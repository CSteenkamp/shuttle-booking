# Email System Setup Guide

The ShuttlePro booking system includes automated email confirmations and reminders. This guide explains how to configure and use the email functionality.

## Features

- **Booking Confirmations**: Automatically sent when a user successfully books a trip
- **24-Hour Reminders**: Sent 24 hours before trip departure
- **1-Hour Reminders**: Urgent reminders sent 1 hour before trip departure
- **Professional HTML Templates**: Beautiful, responsive email designs
- **Error Handling**: Graceful failure handling - bookings succeed even if emails fail

## Setup Instructions

### 1. Configure Environment Variables

Add the following to your `.env` file:

```env
# Email Configuration
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"
CRON_SECRET="your-random-secret-key"
```

### 2. Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password (not your regular password) as `EMAIL_PASS`

### 3. Alternative Email Providers

Update the SMTP configuration in `/src/lib/email.ts`:

```typescript
// For other providers, modify createTransporter()
const transporter = nodemailer.createTransporter({
  host: 'your-smtp-host.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
```

## Testing the System

### Manual Testing

1. Visit `/admin/email-test` to access the testing dashboard
2. Check configuration status
3. Test individual email functions
4. View upcoming bookings that would receive reminders

### API Endpoints

- **Booking Confirmation**: `POST /api/email/booking-confirmation`
- **Send Reminders**: `POST /api/email/send-reminders`
- **View Upcoming**: `GET /api/email/send-reminders`

## Automated Reminders

### Setting Up Cron Jobs

For production, set up automated reminders using:

1. **Vercel Cron** (recommended for Vercel deployments)
2. **External Cron Service** (cron-job.org, etc.)
3. **Server Cron** (for self-hosted)

Example cron job (runs every hour):
```bash
curl -X POST "https://your-domain.com/api/email/send-reminders" \
  -H "Authorization: Bearer YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

### Cron Schedule Recommendations

- **Every hour**: `0 * * * *` - Catches all reminder windows
- **Twice daily**: `0 9,18 * * *` - Morning and evening checks

## Email Templates

### Booking Confirmation
- Sent immediately after successful booking
- Includes trip details, booking ID, pickup/dropoff info
- Professional gradient design with branding

### 24-Hour Reminder
- Sent 23-25 hours before trip departure
- Reminder format with trip summary
- Encourages preparation

### 1-Hour Reminder
- Sent 0.5-1.5 hours before trip departure
- Urgent styling with prominent alerts
- Pickup location emphasis

## Troubleshooting

### Common Issues

1. **"Unauthorized" Error**: Check CRON_SECRET configuration
2. **SMTP Authentication Failed**: Verify EMAIL_USER and EMAIL_PASS
3. **Emails Not Sending**: Check Gmail App Password setup
4. **Template Issues**: Verify HTML email client compatibility

### Debugging

Enable debug logging in `/src/lib/email.ts`:

```typescript
const transporter = nodemailer.createTransporter({
  // ... existing config
  debug: true,
  logger: true,
});
```

### Testing Email Delivery

1. Use the admin testing dashboard
2. Check server logs for email send confirmations
3. Verify spam folders for test emails
4. Test with different email providers

## Production Considerations

1. **Rate Limiting**: Consider email send rate limits
2. **Error Monitoring**: Set up email failure alerts
3. **Backup Notifications**: SMS or push notifications as backup
4. **Bounce Handling**: Handle bounced emails gracefully
5. **Unsubscribe**: Add unsubscribe functionality if required

## Security

- Never commit email credentials to version control
- Use environment variables for all sensitive data
- Rotate CRON_SECRET regularly in production
- Monitor for unusual email sending patterns

## Support

For issues with the email system:
1. Check the admin testing dashboard
2. Review server logs for error messages
3. Verify environment variable configuration
4. Test with a simple email service first