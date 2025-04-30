/*
  # Add payment status to tenants table

  1. Changes
    - Add payment_status column to tenants table with valid status values
    - Set default value to 'pending'
    - Add check constraint to ensure valid status values

  2. Notes
    - Valid payment statuses: paid, pending, overdue
    - Default status is 'pending' for new tenants
*/

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending'
CHECK (payment_status IN ('paid', 'pending', 'overdue'));

-- Update any existing records to have the default status
UPDATE tenants 
SET payment_status = 'pending' 
WHERE payment_status IS NULL;