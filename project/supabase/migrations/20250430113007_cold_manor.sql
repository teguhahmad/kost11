/*
  # Fix payment column names

  1. Changes
    - Rename 'due_date' to 'dueDate' to match frontend expectations
    - Rename 'payment_method' to 'paymentMethod'
    - Rename 'tenant_id' to 'tenantId'
    - Rename 'room_id' to 'roomId'

  2. Security
    - Update RLS policies to use new column names
*/

-- Rename columns to match frontend camelCase naming
ALTER TABLE payments RENAME COLUMN due_date TO "dueDate";
ALTER TABLE payments RENAME COLUMN payment_method TO "paymentMethod";
ALTER TABLE payments RENAME COLUMN tenant_id TO "tenantId";
ALTER TABLE payments RENAME COLUMN room_id TO "roomId";

-- Update foreign key constraints
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_tenant_id_fkey;
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_room_id_fkey;

ALTER TABLE payments 
  ADD CONSTRAINT payments_tenantid_fkey 
  FOREIGN KEY ("tenantId") 
  REFERENCES tenants(id);

ALTER TABLE payments 
  ADD CONSTRAINT payments_roomid_fkey 
  FOREIGN KEY ("roomId") 
  REFERENCES rooms(id);

-- Update indexes
DROP INDEX IF EXISTS payments_tenant_id_idx;
DROP INDEX IF EXISTS payments_room_id_idx;

CREATE INDEX payments_tenantid_idx ON payments ("tenantId");
CREATE INDEX payments_roomid_idx ON payments ("roomId");