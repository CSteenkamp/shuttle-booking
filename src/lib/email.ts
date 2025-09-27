import nodemailer from 'nodemailer';
import { format } from 'date-fns';
import type { CalendarEvent } from './calendar';

interface BookingEmailData {
  userEmail: string;
  userName: string;
  tripDetails: {
    destination: string;
    destinationAddress: string;
    startTime: Date;
    endTime: Date;
    pickupAddress: string;
    passengerCount: number;
    riderName?: string;
    riderPhone?: string;
  };
  bookingId: string;
}

interface ReminderEmailData {
  userEmail: string;
  userName: string;
  tripDetails: {
    destination: string;
    destinationAddress: string;
    startTime: Date;
    endTime: Date;
    pickupAddress: string;
    passengerCount: number;
    riderName?: string;
    riderPhone?: string;
  };
  bookingId: string;
  reminderType: '24h' | '1h';
}

interface CalendarInviteData {
  userEmail: string;
  userName: string;
  event: CalendarEvent;
  icsContent: string;
  bookingId: string;
  passengerDetails?: {
    passengerName: string;
    passengerEmail: string;
    passengerPhone?: string | null;
  };
}

interface EmailVerificationData {
  userEmail: string;
  userName: string;
  verificationToken: string;
  verificationUrl: string;
}

// Create email transporter
const createTransporter = () => {
  // For development, we'll use a test account
  // In production, you'd configure with your actual email service
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

// Generate booking confirmation email HTML
const generateBookingConfirmationHTML = (data: BookingEmailData): string => {
  const { tripDetails, bookingId, userName } = data;
  const tripDate = format(tripDetails.startTime, 'EEEE, MMMM d, yyyy');
  const tripTime = `${format(tripDetails.startTime, 'h:mm a')} - ${format(tripDetails.endTime, 'h:mm a')}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tjoef-Tjaf Booking Confirmation</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
        .content { padding: 40px 30px; }
        .trip-card { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 25px; border-radius: 12px; margin: 25px 0; }
        .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #64748b; font-weight: 500; }
        .value { color: #1e293b; font-weight: 600; }
        .footer { background-color: #f1f5f9; padding: 30px; text-align: center; color: #64748b; }
        .btn { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚐 Tjoef-Tjaf</h1>
          <h2>Booking Confirmed!</h2>
          <p>Hi ${userName}, your shuttle trip has been confirmed.</p>
        </div>
        
        <div class="content">
          <div class="trip-card">
            <h3>📍 ${tripDetails.destination}</h3>
            <p><strong>📅 ${tripDate}</strong></p>
            <p><strong>⏰ ${tripTime}</strong></p>
          </div>
          
          <h3>Trip Details</h3>
          <div class="detail-row">
            <span class="label">Booking ID</span>
            <span class="value">#${bookingId}</span>
          </div>
          <div class="detail-row">
            <span class="label">Destination</span>
            <span class="value">${tripDetails.destination}</span>
          </div>
          <div class="detail-row">
            <span class="label">Address</span>
            <span class="value">${tripDetails.destinationAddress}</span>
          </div>
          <div class="detail-row">
            <span class="label">Pickup Address</span>
            <span class="value">${tripDetails.pickupAddress}</span>
          </div>
          <div class="detail-row">
            <span class="label">Date & Time</span>
            <span class="value">${tripDate} at ${tripTime}</span>
          </div>
          <div class="detail-row">
            <span class="label">Passengers</span>
            <span class="value">${tripDetails.passengerCount}</span>
          </div>
          ${tripDetails.riderName ? `
          <div class="detail-row">
            <span class="label">Rider Name</span>
            <span class="value">${tripDetails.riderName}</span>
          </div>
          ` : ''}
          ${tripDetails.riderPhone ? `
          <div class="detail-row">
            <span class="label">Rider Contact</span>
            <span class="value">${tripDetails.riderPhone}</span>
          </div>
          ` : ''}
          
          <div style="margin: 30px 0; padding: 20px; background-color: #dbeafe; border-radius: 8px; border-left: 4px solid #3b82f6;">
            <h4 style="margin: 0 0 10px 0; color: #1e40af;">Important Reminders</h4>
            <ul style="margin: 0; color: #1e40af;">
              <li>Please be ready 5 minutes before the scheduled pickup time</li>
              <li>Have your booking ID ready: #${bookingId}</li>
              <li>You'll receive reminder emails 24 hours and 1 hour before your trip</li>
              <li>Contact us if you need to make any changes</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Tjoef-Tjaf</strong> - Premium Shuttle Service</p>
          <p>Questions? Reply to this email or contact our support team.</p>
          <p style="font-size: 12px; color: #94a3b8;">This is an automated email. Please do not reply to this message.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Generate reminder email HTML
const generateReminderHTML = (data: ReminderEmailData): string => {
  const { tripDetails, bookingId, userName, reminderType } = data;
  const tripDate = format(tripDetails.startTime, 'EEEE, MMMM d, yyyy');
  const tripTime = `${format(tripDetails.startTime, 'h:mm a')} - ${format(tripDetails.endTime, 'h:mm a')}`;
  const reminderTitle = reminderType === '24h' ? '24 Hour Reminder' : 'Trip Starting Soon!';
  const reminderText = reminderType === '24h' 
    ? 'Your shuttle trip is tomorrow!' 
    : 'Your shuttle will arrive in approximately 1 hour.';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tjoef-Tjaf Trip Reminder</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 40px 30px; text-align: center; }
        .content { padding: 40px 30px; }
        .trip-card { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 25px; border-radius: 12px; margin: 25px 0; }
        .detail-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid #e2e8f0; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #64748b; font-weight: 500; }
        .value { color: #1e293b; font-weight: 600; }
        .footer { background-color: #f1f5f9; padding: 30px; text-align: center; color: #64748b; }
        .urgent { background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚐 Tjoef-Tjaf</h1>
          <h2>${reminderTitle}</h2>
          <p>Hi ${userName}, ${reminderText}</p>
        </div>
        
        <div class="content">
          <div class="trip-card">
            <h3>📍 ${tripDetails.destination}</h3>
            <p><strong>📅 ${tripDate}</strong></p>
            <p><strong>⏰ ${tripTime}</strong></p>
          </div>
          
          ${reminderType === '1h' ? `
            <div class="urgent">
              <h4 style="margin: 0 0 10px 0; color: #d97706;">⚠️ Please be ready!</h4>
              <p style="margin: 0; color: #92400e;">Your shuttle will arrive at <strong>${tripDetails.pickupAddress}</strong> in approximately 1 hour. Please be ready 5 minutes early.</p>
            </div>
          ` : ''}
          
          <h3>Trip Summary</h3>
          <div class="detail-row">
            <span class="label">Booking ID</span>
            <span class="value">#${bookingId}</span>
          </div>
          <div class="detail-row">
            <span class="label">Pickup Address</span>
            <span class="value">${tripDetails.pickupAddress}</span>
          </div>
          <div class="detail-row">
            <span class="label">Destination</span>
            <span class="value">${tripDetails.destination}</span>
          </div>
          <div class="detail-row">
            <span class="label">Time</span>
            <span class="value">${tripTime}</span>
          </div>
          <div class="detail-row">
            <span class="label">Passengers</span>
            <span class="value">${tripDetails.passengerCount}</span>
          </div>
          ${tripDetails.riderName ? `
          <div class="detail-row">
            <span class="label">Rider Name</span>
            <span class="value">${tripDetails.riderName}</span>
          </div>
          ` : ''}
          ${tripDetails.riderPhone ? `
          <div class="detail-row">
            <span class="label">Rider Contact</span>
            <span class="value">${tripDetails.riderPhone}</span>
          </div>
          ` : ''}
        </div>
        
        <div class="footer">
          <p><strong>Tjoef-Tjaf</strong> - Premium Shuttle Service</p>
          <p>Have a great trip! Contact us if you need any assistance.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send booking confirmation email
export const sendBookingConfirmation = async (data: BookingEmailData): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    const htmlContent = generateBookingConfirmationHTML(data);

    const mailOptions = {
      from: `"Tjoef-Tjaf" <${process.env.EMAIL_USER}>`,
      to: data.userEmail,
      subject: `🚐 Booking Confirmed - ${data.tripDetails.destination} on ${format(data.tripDetails.startTime, 'MMM d')}`,
      html: htmlContent,
      text: `Your Tjoef-Tjaf booking has been confirmed! Booking ID: #${data.bookingId}. Trip to ${data.tripDetails.destination} on ${format(data.tripDetails.startTime, 'EEEE, MMMM d, yyyy')} at ${format(data.tripDetails.startTime, 'h:mm a')}.`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Booking confirmation email sent to ${data.userEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending booking confirmation email:', error);
    return false;
  }
};

// Send reminder email
export const sendReminderEmail = async (data: ReminderEmailData): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    const htmlContent = generateReminderHTML(data);
    const reminderTitle = data.reminderType === '24h' ? '24 Hour Reminder' : 'Trip Starting Soon!';

    const mailOptions = {
      from: `"Tjoef-Tjaf" <${process.env.EMAIL_USER}>`,
      to: data.userEmail,
      subject: `🚐 ${reminderTitle} - ${data.tripDetails.destination}`,
      html: htmlContent,
      text: `Tjoef-Tjaf Reminder: Your trip to ${data.tripDetails.destination} is ${data.reminderType === '24h' ? 'tomorrow' : 'starting soon'}. Booking ID: #${data.bookingId}`,
    };

    await transporter.sendMail(mailOptions);
    console.log(`${data.reminderType} reminder email sent to ${data.userEmail}`);
    return true;
  } catch (error) {
    console.error(`Error sending ${data.reminderType} reminder email:`, error);
    return false;
  }
};

// Send email to all passengers in a trip
export const sendTripNotificationToAllPassengers = async (
  tripId: string, 
  subject: string, 
  message: string
): Promise<void> => {
  try {
    // This would be implemented to notify all passengers of changes
    // For now, we'll log it
    console.log(`Trip notification for trip ${tripId}: ${subject} - ${message}`);
  } catch (error) {
    console.error('Error sending trip notification:', error);
  }
};

// Generate calendar invite email HTML
const generateCalendarInviteHTML = (data: CalendarInviteData) => {
  const tripDate = format(data.event.startTime, 'EEEE, MMMM d, yyyy');
  const tripTime = format(data.event.startTime, 'h:mm a');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Calendar Invite - Tjoef-Tjaf</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: bold; }
        .header h2 { margin: 10px 0 0 0; font-size: 18px; font-weight: normal; opacity: 0.9; }
        .content { padding: 30px; }
        .calendar-card { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); border-radius: 12px; padding: 25px; margin: 20px 0; text-align: center; }
        .calendar-card h3 { margin: 0 0 15px 0; font-size: 22px; color: #2d3748; }
        .calendar-card .date { font-size: 18px; font-weight: 600; color: #4a5568; margin-bottom: 5px; }
        .calendar-card .time { font-size: 16px; color: #718096; }
        .calendar-buttons { text-align: center; margin: 25px 0; }
        .calendar-button { display: inline-block; margin: 0 10px; padding: 12px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
        .calendar-button:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.2); }
        .trip-details { background-color: #f7fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #e2e8f0; }
        .detail-row:last-child { border-bottom: none; margin-bottom: 0; }
        .label { color: #64748b; font-weight: 500; }
        .value { color: #1e293b; font-weight: 600; }
        .footer { background-color: #f1f5f9; padding: 30px; text-align: center; color: #64748b; }
        .attachment-note { background-color: #e6fffa; border: 2px solid #38b2ac; border-radius: 8px; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚐 Driver Schedule Update</h1>
          <h2>New Shuttle Trip Booking</h2>
          <p>Hi ${data.userName}, a new trip has been booked and added to your driver schedule!</p>
        </div>
        
        <div class="content">
          <div class="calendar-card">
            <h3>📍 ${data.event.title}</h3>
            <div class="date">${tripDate}</div>
            <div class="time">${tripTime}</div>
          </div>

          <div class="attachment-note">
            <h4 style="margin: 0 0 10px 0; color: #2c7a7b;">📎 Calendar File Attached</h4>
            <p style="margin: 0; color: #285e61;">
              An .ics calendar file is attached to this email. Double-click the attachment to add this event to your calendar app.
            </p>
          </div>

          <div class="calendar-buttons">
            <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(data.event.title)}&dates=${data.event.startTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${data.event.endTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=${encodeURIComponent(data.event.description)}&location=${encodeURIComponent(data.event.location)}" 
               class="calendar-button" target="_blank">
              📆 Add to Google Calendar
            </a>
            <a href="https://outlook.live.com/calendar/0/deeplink/compose?subject=${encodeURIComponent(data.event.title)}&startdt=${data.event.startTime.toISOString()}&enddt=${data.event.endTime.toISOString()}&body=${encodeURIComponent(data.event.description)}&location=${encodeURIComponent(data.event.location)}" 
               class="calendar-button" target="_blank">
              📧 Add to Outlook
            </a>
          </div>
          
          <div class="trip-details">
            <h3>Trip Details</h3>
            <div class="detail-row">
              <span class="label">Booking ID</span>
              <span class="value">#${data.bookingId}</span>
            </div>
            <div class="detail-row">
              <span class="label">Pickup Location</span>
              <span class="value">${data.event.location}</span>
            </div>
            <div class="detail-row">
              <span class="label">Start Time</span>
              <span class="value">${tripTime}</span>
            </div>
            <div class="detail-row">
              <span class="label">End Time</span>
              <span class="value">${format(data.event.endTime, 'h:mm a')}</span>
            </div>
            ${data.passengerDetails ? `
            <div class="detail-row">
              <span class="label">Passenger Name</span>
              <span class="value">${data.passengerDetails.passengerName}</span>
            </div>
            <div class="detail-row">
              <span class="label">Passenger Email</span>
              <span class="value">${data.passengerDetails.passengerEmail}</span>
            </div>
            ${data.passengerDetails.passengerPhone ? `
            <div class="detail-row">
              <span class="label">Passenger Phone</span>
              <span class="value">${data.passengerDetails.passengerPhone}</span>
            </div>
            ` : ''}
            ` : ''}
          </div>

          <div style="background-color: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #d97706;">⏰ Reminders Set</h4>
            <p style="margin: 0; color: #92400e;">
              Your calendar event includes automatic reminders:
              <br>• 15 minutes before departure
              <br>• 5 minutes before departure
            </p>
          </div>
        </div>
        
        <div class="footer">
          <p><strong>Tjoef-Tjaf</strong> - Driver Schedule Management</p>
          <p>Stay organized with automatic calendar integration for all bookings!</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send calendar invite email with ICS attachment
export const sendEmail = async (data: {
  to: string
  subject: string
  html: string
}): Promise<boolean> => {
  try {
    const transporter = nodemailer.createTransporter({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Tjoef-Tjaf" <${process.env.EMAIL_USER}>`,
      to: data.to,
      subject: data.subject,
      html: data.html,
    });

    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

export const sendCalendarInvite = async (data: CalendarInviteData): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    const htmlContent = generateCalendarInviteHTML(data);

    const mailOptions = {
      from: `"Tjoef-Tjaf Driver Schedule" <${process.env.EMAIL_USER}>`,
      to: data.userEmail,
      subject: `🚐 New Booking: ${data.event.title}`,
      html: htmlContent,
      text: `Your Tjoef-Tjaf trip has been added to your calendar! ${data.event.title} on ${format(data.event.startTime, 'EEEE, MMMM d, yyyy')} at ${format(data.event.startTime, 'h:mm a')}. Booking ID: #${data.bookingId}`,
      attachments: [
        {
          filename: `shuttle-trip-${data.bookingId}.ics`,
          content: data.icsContent,
          contentType: 'text/calendar; charset=utf-8; method=REQUEST'
        }
      ]
    };

    await transporter.sendMail(mailOptions);
    console.log(`Calendar invite email sent to ${data.userEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending calendar invite email:', error);
    return false;
  }
};

const generateEmailVerificationHTML = (data: EmailVerificationData): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Verify Your Email - Tjoef-Tjaf</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1); margin-top: 40px; margin-bottom: 40px;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
          <div style="background: rgba(255,255,255,0.2); border-radius: 50%; width: 80px; height: 80px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 40px;">📧</span>
          </div>
          <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 700;">Welcome to Tjoef-Tjaf!</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Please verify your email address</p>
        </div>

        <!-- Content -->
        <div style="padding: 40px 30px;">
          <h2 style="color: #2d3748; margin: 0 0 20px; font-size: 24px;">Hi ${data.userName || 'there'}! 👋</h2>
          
          <p style="color: #4a5568; line-height: 1.6; margin: 0 0 25px; font-size: 16px;">
            Thank you for registering with Tjoef-Tjaf! To complete your account setup and start booking shuttle trips, please verify your email address by clicking the button below.
          </p>

          <div style="text-align: center; margin: 35px 0;">
            <a href="${data.verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #4299e1 0%, #3182ce 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 15px rgba(66, 153, 225, 0.4); transition: all 0.3s ease;">
              ✅ Verify Email Address
            </a>
          </div>

          <div style="background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%); border-radius: 12px; padding: 20px; margin: 30px 0;">
            <h3 style="color: #2d3748; margin: 0 0 15px; font-size: 18px; display: flex; align-items: center;">
              <span style="margin-right: 8px;">🚀</span> What happens next?
            </h3>
            <ul style="color: #4a5568; margin: 0; padding-left: 20px; line-height: 1.6;">
              <li>Your account will be activated</li>
              <li>You can start booking shuttle trips</li>
              <li>Receive booking confirmations and reminders</li>
              <li>Manage your pickup locations and riders</li>
            </ul>
          </div>

          <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 30px 0 0; text-align: center;">
            If you didn't create an account with Tjoef-Tjaf, you can safely ignore this email.
          </p>

          <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <p style="color: #a0aec0; font-size: 12px; margin: 0;">
              This verification link will expire in 24 hours for security.
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="background: #f7fafc; padding: 25px 30px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #718096; margin: 0; font-size: 14px;">
            <strong>Tjoef-Tjaf</strong> - Making Every Ride Easy & Safe
          </p>
          <p style="color: #a0aec0; margin: 5px 0 0; font-size: 12px;">
            Questions? Contact us at tjoeftjafshuttle@gmail.com
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const sendEmailVerification = async (data: EmailVerificationData): Promise<boolean> => {
  try {
    const transporter = createTransporter();
    const htmlContent = generateEmailVerificationHTML(data);

    const mailOptions = {
      from: `"Tjoef-Tjaf" <${process.env.EMAIL_USER}>`,
      to: data.userEmail,
      subject: '📧 Verify Your Email Address - Tjoef-Tjaf',
      html: htmlContent,
      text: `Welcome to Tjoef-Tjaf! Please verify your email address by visiting: ${data.verificationUrl}. This link will expire in 24 hours for security.`
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email verification sent to ${data.userEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending email verification:', error);
    return false;
  }
};