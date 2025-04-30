/*
  # Add new_data and old_data columns to audit logs

  1. Changes
    - Add `old_data` column to `backoffice_audit_logs` table
      - Type: JSONB
      - Default: empty JSON object
      - Nullable: true
      - Purpose: Store previous state of records for audit tracking
    - Add `new_data` column to `backoffice_audit_logs` table
      - Type: JSONB
      - Default: empty JSON object
      - Nullable: true
      - Purpose: Store new state of records for audit tracking

  2. Notes
    - These columns are required for the audit logging mechanism
    - Used to track changes in role permissions and other backoffice operations
    - Both columns use JSONB type to store flexible data structures
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'backoffice_audit_logs' 
    AND column_name = 'old_data'
  ) THEN
    ALTER TABLE backoffice_audit_logs 
    ADD COLUMN old_data JSONB DEFAULT '{}'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'backoffice_audit_logs' 
    AND column_name = 'new_data'
  ) THEN
    ALTER TABLE backoffice_audit_logs 
    ADD COLUMN new_data JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;