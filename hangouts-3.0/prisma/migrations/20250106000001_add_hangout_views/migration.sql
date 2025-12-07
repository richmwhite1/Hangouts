-- Create hangout_views table for tracking when users last viewed hangouts
CREATE TABLE IF NOT EXISTS "public"."hangout_views" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hangoutId" TEXT NOT NULL,
    "lastViewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hangout_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "hangout_views_userId_hangoutId_key" ON "public"."hangout_views"("userId", "hangoutId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "hangout_views_userId_idx" ON "public"."hangout_views"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "hangout_views_hangoutId_idx" ON "public"."hangout_views"("hangoutId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "hangout_views_lastViewedAt_idx" ON "public"."hangout_views"("lastViewedAt");

-- AddForeignKey
ALTER TABLE "public"."hangout_views" ADD CONSTRAINT "hangout_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hangout_views" ADD CONSTRAINT "hangout_views_hangoutId_fkey" FOREIGN KEY ("hangoutId") REFERENCES "public"."content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

