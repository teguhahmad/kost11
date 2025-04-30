/*
  # Add old_data column to audit logs

  1. Changes
    - Add `old_data` column to `backoffice_audit_logs` table
      - Type: JSONB
      - Default: empty JSON object
      - Nullable: true
      - Purpose: Store previous state of records for audit tracking

  2. Notes
    - This column is required for the audit logging mechanism
    - Used to track changes in role permissions and other backoffice operations
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
END $$;