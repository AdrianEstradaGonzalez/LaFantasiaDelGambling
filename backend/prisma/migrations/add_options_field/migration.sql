-- Migration: Add options field to bet_option table
-- This migration adds a JSON column to store multiple betting options
-- while preserving existing data

-- Add the new 'options' column as nullable
ALTER TABLE "bet_option" ADD COLUMN "options" JSONB;

-- Make 'odd' column have a default value
ALTER TABLE "bet_option" ALTER COLUMN "odd" SET DEFAULT 1.0;

-- Update existing records to convert single option to array format
-- This preserves all existing data by wrapping betLabel and odd in an array
UPDATE "bet_option" 
SET "options" = jsonb_build_array(
  jsonb_build_object(
    'label', "betLabel",
    'odd', "odd"
  )
)
WHERE "options" IS NULL;

-- Add comment to document the structure
COMMENT ON COLUMN "bet_option"."options" IS 'Array of betting options with {label: string, odd: number} structure';
