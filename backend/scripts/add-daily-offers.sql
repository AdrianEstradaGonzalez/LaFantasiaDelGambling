-- CreateTable
CREATE TABLE IF NOT EXISTS "daily_offer" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "playerId" INTEGER NOT NULL,
    "playerName" TEXT NOT NULL,
    "division" TEXT NOT NULL,
    "originalPrice" INTEGER NOT NULL,
    "offerPrice" INTEGER NOT NULL,
    "discount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "offer_history" (
    "id" TEXT NOT NULL,
    "playerId" INTEGER NOT NULL,
    "lastOffer" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offer_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "daily_offer_date_playerId_key" ON "daily_offer"("date", "playerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "daily_offer_date_division_idx" ON "daily_offer"("date", "division");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "daily_offer_playerId_idx" ON "daily_offer"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "offer_history_playerId_key" ON "offer_history"("playerId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "offer_history_lastOffer_idx" ON "offer_history"("lastOffer");
