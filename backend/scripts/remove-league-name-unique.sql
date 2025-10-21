-- Remove unique constraint from League.name
-- This allows multiple leagues to have the same name
-- Only the code field remains unique for each league

ALTER TABLE "League" DROP CONSTRAINT IF EXISTS "League_name_key";
