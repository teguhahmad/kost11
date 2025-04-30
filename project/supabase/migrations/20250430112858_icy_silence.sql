/*
  # Add missing columns to payments table

  1. Changes
    - Add missing columns to payments table:
      - `date` (timestamptz) - When the payment was made
      - `due_date` (timestamptz) - When the payment is due
      - `tenant_id` (uuid) - Reference to the tenant
      - `room_id` (uuid) - Reference to the room
      - `payment_method` (text) - How the payment was made
      - `notes` (text) - Additional payment notes

  2. Foreign Keys
    - Add foreign key constraints for tenant_id and room_id
    - References tenants and rooms tables respectively

  3. Default Values
    - Set appropriate default values for timestamps
    - Make required fields non-nullable
*/

-- Add new columns
ALTER TABLE payments
ADD COLUMN IF NOT EXISTS date timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS due_date timestamptz,
ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES tenants(id),
ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES rooms(id),
ADD COLUMN IF NOT EXISTS payment_method text,
ADD COLUMN IF NOT EXISTS notes text;

-- Add indexes for foreign keys
CREATE INDEX IF NOT EXISTS payments_tenant_id_idx ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS payments_room_id_idx ON payments(room_id);

-- Update RLS policies to include new columns
CREATE POLICY "Users can view payments for their properties"
ON payments
FOR SELECT
TO authenticated
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can insert payments for their properties"
ON payments
FOR INSERT
TO authenticated
WITH CHECK (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can update payments for their properties"
ON payments
FOR UPDATE
TO authenticated
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
)
WITH CHECK (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "Users can delete payments for their properties"
ON payments
FOR DELETE
TO authenticated
USING (
  property_id IN (
    SELECT id FROM properties WHERE owner_id = auth.uid()
  )
);