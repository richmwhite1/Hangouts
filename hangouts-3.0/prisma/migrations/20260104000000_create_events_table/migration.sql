-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "latitude" DECIMAL(10, 8),
    "longitude" DECIMAL(11, 8),
    "start_time" TIMESTAMP(3) WITH TIME ZONE,
    "end_time" TIMESTAMP(3) WITH TIME ZONE,
    "source_url" TEXT,
    "external_id" TEXT,
    "category_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "interest_score" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- Composite index for location-based queries with time filtering
CREATE INDEX "events_location_time_idx" ON "events"("latitude", "longitude", "start_time");

-- CreateIndex
-- Index for temporal filtering and sorting
CREATE INDEX "events_start_time_idx" ON "events"("start_time");

-- CreateIndex
-- Index for ranking by interest score
CREATE INDEX "events_interest_score_idx" ON "events"("interest_score" DESC);

-- CreateIndex
-- Index for category filtering using GIN index for array operations
CREATE INDEX "events_category_tags_idx" ON "events" USING GIN ("category_tags");

-- CreateIndex
-- Unique constraint to prevent duplicate events from the same source
CREATE UNIQUE INDEX "events_source_external_unique" ON "events"("source_url", "external_id") 
WHERE "source_url" IS NOT NULL AND "external_id" IS NOT NULL;

-- CreateIndex
-- Index for updated_at to track recent changes
CREATE INDEX "events_updated_at_idx" ON "events"("updated_at");
