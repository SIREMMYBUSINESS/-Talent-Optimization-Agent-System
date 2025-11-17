/*
  # Create User Profiles Table

  ## Overview
  Creates a user profiles table to store additional information about authenticated users
  beyond what's in Supabase auth.users table.

  ## Tables Created
    - `user_profiles`
      - `id` (uuid, primary key) - references auth.users
      - `full_name` (text) - user's full name
      - `role` (text) - user role (admin, hr_manager, recruiter, employee)
      - `department` (text) - user's department
      - `phone` (text) - contact phone number
      - `avatar_url` (text) - profile picture URL
      - `created_at` (timestamptz) - profile creation timestamp
      - `updated_at` (timestamptz) - last update timestamp

  ## Security
    - Enable RLS on `user_profiles` table
    - Users can read their own profile
    - Users can update their own profile
    - Admins can read all profiles
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role text DEFAULT 'employee' CHECK (role IN ('admin', 'hr_manager', 'recruiter', 'employee')),
  department text,
  phone text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can create own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can update any profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);


-- Create function to handle updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Replace with actual auth.uid() values
INSERT INTO user_profiles (id, full_name, role, department, phone)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Alice Admin', 'admin', 'Compliance', '123-456-7890'),
  ('00000000-0000-0000-0000-000000000002', 'Bob Recruiter', 'recruiter', 'HR', '234-567-8901');

