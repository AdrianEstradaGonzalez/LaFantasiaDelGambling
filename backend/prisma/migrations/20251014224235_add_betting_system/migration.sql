-- AlterTable
ALTER TABLE "LeagueMember" ADD COLUMN     "bettingBudget" INTEGER NOT NULL DEFAULT 250;

-- CreateTable
CREATE TABLE "bet" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jornada" INTEGER NOT NULL,
    "matchId" INTEGER NOT NULL,
    "betType" TEXT NOT NULL,
    "betLabel" TEXT NOT NULL,
    "odd" DOUBLE PRECISION NOT NULL,
    "amount" INTEGER NOT NULL,
    "potentialWin" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bet_leagueId_userId_idx" ON "bet"("leagueId", "userId");

-- CreateIndex
CREATE INDEX "bet_jornada_idx" ON "bet"("jornada");

-- CreateIndex
CREATE INDEX "bet_status_idx" ON "bet"("status");

-- AddForeignKey
ALTER TABLE "bet" ADD CONSTRAINT "bet_leagueId_userId_fkey" FOREIGN KEY ("leagueId", "userId") REFERENCES "LeagueMember"("leagueId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
