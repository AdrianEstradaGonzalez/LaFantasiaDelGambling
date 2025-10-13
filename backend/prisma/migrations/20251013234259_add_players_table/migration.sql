-- CreateTable
CREATE TABLE "player" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "teamId" INTEGER NOT NULL,
    "teamName" TEXT NOT NULL,
    "teamCrest" TEXT,
    "nationality" TEXT,
    "shirtNumber" INTEGER,
    "photo" TEXT,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "player_teamId_idx" ON "player"("teamId");

-- CreateIndex
CREATE INDEX "player_position_idx" ON "player"("position");

-- CreateIndex
CREATE INDEX "player_price_idx" ON "player"("price");
