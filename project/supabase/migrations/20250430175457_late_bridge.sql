/*
  # Create notifications table

  1. New Tables
    - `notifications`
      - `id` (uuid, primary key)
      - `title` (text)
      - `message` (text)
      - `type` (text)
      - `status` (text)
      - `target_user_id` (uuid, nullable)
      - `target_property_id` (uuid, nullable)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `notifications` table
    - Add policies for authenticated users
*/

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('system', 'user', 'property', 'payment')),
  status text NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read')),
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  target_property_id uuid REFERENCES properties(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (
    target_user_id = auth.uid() OR 
    target_user_id IS NULL OR
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = notifications.target_property_id 
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (
    target_user_id = auth.uid() OR 
    target_user_id IS NULL OR
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = notifications.target_property_id 
      AND properties.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    target_user_id = auth.uid() OR 
    target_user_id IS NULL OR
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = notifications.target_property_id 
      AND properties.owner_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their notifications"
  ON notifications
  FOR DELETE
  TO authenticated
  USING (
    target_user_id = auth.uid() OR 
    target_user_id IS NULL OR
    EXISTS (
      SELECT 1 FROM properties 
      WHERE properties.id = notifications.target_property_id 
      AND properties.owner_id = auth.uid()
    )
  );

-- Create index for faster queries
CREATE INDEX notifications_target_user_id_idx ON notifications(target_user_id);
CREATE INDEX notifications_target_property_id_idx ON notifications(target_property_id);
CREATE INDEX notifications_status_idx ON notifications(status);