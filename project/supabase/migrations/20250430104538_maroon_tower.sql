/*
  # Add missing columns to rooms table

  1. Changes
    - Add tenant_id column with foreign key reference to tenants
    - Add price column for room pricing
    - Add facilities column for room amenities

  2. Security
    - Maintain existing RLS policies
*/

-- Add tenant_id column
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id);

-- Add price column
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS price numeric NOT NULL DEFAULT 0;

-- Add facilities column
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS facilities jsonb DEFAULT '[]'::jsonb;