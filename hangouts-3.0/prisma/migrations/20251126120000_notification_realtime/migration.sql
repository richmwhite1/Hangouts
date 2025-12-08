-- Notification system enhancements: extend enums, add push subscriptions, and improve indexes

-- Extend NotificationType enum with the latest variants (safe for repeated runs)
DO $$
BEGIN
    ALTER TYPE "public"."NotificationType" ADD VALUE IF NOT EXISTS 'POLL_VOTE_CAST';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE "public"."NotificationType" ADD VALUE IF NOT EXISTS 'POLL_CONSENSUS_REACHED';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE "public"."NotificationType" ADD VALUE IF NOT EXISTS 'HANGOUT_CONFIRMED';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE "public"."NotificationType" ADD VALUE IF NOT EXISTS 'HANGOUT_CANCELLED';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE "public"."NotificationType" ADD VALUE IF NOT EXISTS 'HANGOUT_REMINDER';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE "public"."NotificationType" ADD VALUE IF NOT EXISTS 'HANGOUT_STARTING_SOON';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE "public"."NotificationType" ADD VALUE IF NOT EXISTS 'EVENT_REMINDER';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE "public"."NotificationType" ADD VALUE IF NOT EXISTS 'EVENT_STARTING_SOON';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE "public"."NotificationType" ADD VALUE IF NOT EXISTS 'PHOTO_SHARED';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Create push_subscriptions table for web push support
CREATE TABLE IF NOT EXISTS "public"."push_subscriptions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "push_subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "push_subscriptions_endpoint_key" ON "public"."push_subscriptions"("endpoint");
CREATE INDEX IF NOT EXISTS "push_subscriptions_userId_idx" ON "public"."push_subscriptions"("userId");

-- Improve notification query performance
CREATE INDEX IF NOT EXISTS "notifications_userId_createdAt_idx" ON "public"."notifications"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_createdAt_idx" ON "public"."notifications"("userId", "isRead", "createdAt");







