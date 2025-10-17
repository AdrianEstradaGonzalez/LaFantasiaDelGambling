-- Add lastJornadaPoints column to player table
ALTER TABLE "player"
ADD COLUMN IF NOT EXISTS "lastJornadaPoints" INTEGER NOT NULL DEFAULT 0;
