-- CreateEnum
CREATE TYPE "HangoutFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUALLY', 'SOMETIMES');

-- AlterTable
ALTER TABLE "friendships" ADD COLUMN "desiredHangoutFrequency" "HangoutFrequency";

-- CreateIndex
CREATE INDEX "friendships_desiredHangoutFrequency_idx" ON "friendships"("desiredHangoutFrequency");

-- AlterEnum (add RELATIONSHIP_REMINDER to NotificationType)
ALTER TYPE "NotificationType" ADD VALUE 'RELATIONSHIP_REMINDER';

