-- Phase 2: Driver Operations, Quality & Financial Features
-- This migration adds models and fields for:
-- 1. Driver operations (online status, calendar events)
-- 2. Rating system (two-way ratings)
-- 3. Push notifications
-- 4. Trip status tracking
-- 5. Gamification (badges)
-- 6. Driver payouts

-- Add new enums for Phase 2
CREATE TYPE "RatingRole" AS ENUM ('CUSTOMER_RATING_DRIVER', 'DRIVER_RATING_CUSTOMER');
CREATE TYPE "BadgeType" AS ENUM ('TRIPS_MILESTONE', 'RATING_ACHIEVEMENT', 'STREAK_ACHIEVEMENT', 'EARNINGS_MILESTONE', 'SPECIAL_AWARD');

-- Update DriverProfile table with Phase 2 fields
ALTER TABLE "driver_profiles" ADD COLUMN "isOnline" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "driver_profiles" ADD COLUMN "availabilityHours" JSONB;

-- Create index for online drivers
CREATE INDEX "driver_profiles_isOnline_idx" ON "driver_profiles"("isOnline");

-- CalendarEvent table (synced from Google Calendar)
CREATE TABLE "calendar_events" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "isBlocking" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- Add foreign key and indexes for calendar_events
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "calendar_events_driverId_externalEventId_key" ON "calendar_events"("driverId", "externalEventId");
CREATE INDEX "calendar_events_driverId_startTime_endTime_idx" ON "calendar_events"("driverId", "startTime", "endTime");

-- Rating table (two-way ratings)
CREATE TABLE "ratings" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "raterId" TEXT NOT NULL,
    "ratedUserId" TEXT NOT NULL,
    "ratedDriverId" TEXT,
    "role" "RatingRole" NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "tags" TEXT[],
    "isReported" BOOLEAN NOT NULL DEFAULT false,
    "reportReason" TEXT,
    "adminReviewed" BOOLEAN NOT NULL DEFAULT false,
    "adminResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- Add indexes for ratings
CREATE INDEX "ratings_ratedDriverId_stars_idx" ON "ratings"("ratedDriverId", "stars");
CREATE INDEX "ratings_raterId_createdAt_idx" ON "ratings"("raterId", "createdAt");
CREATE INDEX "ratings_tripId_idx" ON "ratings"("tripId");

-- PushSubscription table (Web Push notifications)
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "platform" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- Add indexes for push_subscriptions
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");
CREATE INDEX "push_subscriptions_userId_isActive_idx" ON "push_subscriptions"("userId", "isActive");

-- TripStatusHistory table (audit trail for trip status changes)
CREATE TABLE "trip_status_history" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "assignmentId" TEXT,
    "fromStatus" "AssignmentStatus",
    "toStatus" "AssignmentStatus" NOT NULL,
    "changedBy" TEXT,
    "note" TEXT,
    "location" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_status_history_pkey" PRIMARY KEY ("id")
);

-- Add indexes for trip_status_history
CREATE INDEX "trip_status_history_tripId_createdAt_idx" ON "trip_status_history"("tripId", "createdAt");
CREATE INDEX "trip_status_history_assignmentId_createdAt_idx" ON "trip_status_history"("assignmentId", "createdAt");

-- DriverBadge table (gamification)
CREATE TABLE "driver_badges" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "badgeType" "BadgeType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "driver_badges_pkey" PRIMARY KEY ("id")
);

-- Add foreign key and indexes for driver_badges
ALTER TABLE "driver_badges" ADD CONSTRAINT "driver_badges_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "driver_badges_driverId_badgeType_idx" ON "driver_badges"("driverId", "badgeType");

-- DriverPayout table (payment batch tracking)
CREATE TABLE "driver_payouts" (
    "id" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "totalEarnings" INTEGER NOT NULL,
    "platformFee" INTEGER NOT NULL,
    "netAmount" INTEGER NOT NULL,
    "tripCount" INTEGER NOT NULL,
    "bankName" TEXT,
    "accountNumber" TEXT,
    "accountHolder" TEXT,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "processedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paymentReference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "driver_payouts_pkey" PRIMARY KEY ("id")
);

-- Add indexes for driver_payouts
CREATE INDEX "driver_payouts_driverId_status_idx" ON "driver_payouts"("driverId", "status");
CREATE INDEX "driver_payouts_periodStart_periodEnd_idx" ON "driver_payouts"("periodStart", "periodEnd");
CREATE INDEX "driver_payouts_status_createdAt_idx" ON "driver_payouts"("status", "createdAt");

-- Add comment to migration
COMMENT ON TABLE "calendar_events" IS 'Synced calendar events from Google Calendar for driver availability tracking';
COMMENT ON TABLE "ratings" IS 'Two-way rating system between drivers and customers';
COMMENT ON TABLE "push_subscriptions" IS 'Web Push notification subscriptions for real-time alerts';
COMMENT ON TABLE "trip_status_history" IS 'Audit trail for trip and assignment status changes';
COMMENT ON TABLE "driver_badges" IS 'Gamification badges earned by drivers';
COMMENT ON TABLE "driver_payouts" IS 'Batch payouts to drivers with commission tracking';
