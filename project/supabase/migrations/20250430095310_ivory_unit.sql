/*
  # Add tenant contact information columns

  1. Changes
    - Add `name`, `email`, and `phone` columns to `tenants` table
    - Add unique constraint on email per property to prevent duplicates
    - Add validation check for phone numbers

  2. Security
    - No changes to RLS policies needed
    - Existing policies will apply to new columns
*/

DO $$ BEGIN
  -- Add name column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'name'
  ) THEN
    ALTER TABLE tenants ADD COLUMN name text NOT NULL;
  END IF;

  -- Add email column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'email'
  ) THEN
    ALTER TABLE tenants ADD COLUMN email text NOT NULL;
  END IF;

  -- Add phone column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'phone'
  ) THEN
    ALTER TABLE tenants ADD COLUMN phone text NOT NULL;
  END IF;

  -- Add unique constraint for email per property
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'tenants' AND constraint_name = 'tenants_email_property_id_key'
  ) THEN
    ALTER TABLE tenants ADD CONSTRAINT tenants_email_property_id_key UNIQUE (email, property_id);
  END IF;

  -- Add check constraint for phone format
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'tenants' AND constraint_name = 'tenants_phone_check'
  ) THEN
    ALTER TABLE tenants ADD CONSTRAINT tenants_phone_check CHECK (length(phone) >= 10);
  END IF;
END $$;