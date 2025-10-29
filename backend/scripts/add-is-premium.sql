-- Add isPremium column to league table
ALTER TABLE league ADD COLUMN IF NOT EXISTS "isPremium" BOOLEAN NOT NULL DEFAULT false;

-- Update existing leagues: set isPremium = true where division = 'segunda'
UPDATE league SET "isPremium" = true WHERE division = 'segunda';

-- Verify the changes
SELECT id, name, division, "isPremium" FROM league LIMIT 10;
