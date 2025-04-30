/*
  # Add room type column

  1. Changes
    - Add `type` column to `rooms` table with text type
    - Set default value to 'standard'
    - Add check constraint to ensure valid room types
    - Add NOT NULL constraint

  2. Notes
    - Uses safe ALTER TABLE operation
    - Adds validation for room types
    - Sets a default value to maintain data consistency
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'rooms' AND column_name = 'type'
  ) THEN
    ALTER TABLE rooms 
    ADD COLUMN type text NOT NULL DEFAULT 'standard'
    CHECK (type IN ('standard', 'deluxe', 'suite', 'single', 'double'));
  END IF;
END $$;