/*
  # Add facilities column to rooms table

  1. Changes
    - Add `facilities` column to `rooms` table as JSONB with default empty array
    - Update RLS policies to include the new column

  2. Security
    - Existing RLS policies will automatically apply to the new column
*/

-- Add facilities column to rooms table
ALTER TABLE rooms 
ADD COLUMN IF NOT EXISTS facilities JSONB DEFAULT '[]'::jsonb;