-- AlterTable
ALTER TABLE "content" ADD COLUMN "lastActivityAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "content_lastActivityAt_idx" ON "content"("lastActivityAt");

-- CreateIndex
CREATE INDEX "content_participants_userId_contentId_idx" ON "content_participants"("userId", "contentId");

-- CreateIndex
CREATE INDEX "rsvps_contentId_userId_status_idx" ON "rsvps"("contentId", "userId", "status");


