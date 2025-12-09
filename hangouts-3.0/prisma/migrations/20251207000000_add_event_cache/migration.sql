-- CreateTable
CREATE TABLE "event_cache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_cache_cacheKey_key" ON "event_cache"("cacheKey");

-- CreateIndex
CREATE INDEX "event_cache_cacheKey_idx" ON "event_cache"("cacheKey");

-- CreateIndex
CREATE INDEX "event_cache_expiresAt_idx" ON "event_cache"("expiresAt");

