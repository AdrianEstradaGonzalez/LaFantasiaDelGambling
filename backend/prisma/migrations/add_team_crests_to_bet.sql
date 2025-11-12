-- Add team crests to bet table
ALTER TABLE "bet" ADD COLUMN IF NOT EXISTS "homeCrest" TEXT;
ALTER TABLE "bet" ADD COLUMN IF NOT EXISTS "awayCrest" TEXT;
