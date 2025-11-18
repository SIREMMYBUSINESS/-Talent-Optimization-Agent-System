/*
  # Create Onboarding Plans and Tasks Tables

  ## Overview
  Creates tables for managing employee onboarding plans, tasks, and training schedules
  after candidates are hired.

  ## Tables Created
    
  ### `onboarding_plans`
    - `id` (uuid, primary key) - unique plan identifier
    - `candidate_id` (uuid, required) - references hired candidate
    - `employee_id` (uuid) - references user_profiles once account created
    - `start_date` (date) - first day of employment
    - `department` (text) - which department
    - `position` (text) - job title/position
    - `manager_id` (uuid) - references assigned manager
    - `status` (text) - pending, in_progress, completed, cancelled
    - `completion_percentage` (integer) - 0-100 progress tracker
    - `notes` (text) - additional onboarding notes
    - `created_at` (timestamptz) - plan creation
    - `updated_at` (timestamptz) - last update
    - `completed_at` (timestamptz) - when onboarding finished

  ### `onboarding_tasks`
    - `id` (uuid, primary key) - unique task identifier
    - `onboarding_plan_id` (uuid, required) - references onboarding_plans
    - `title` (text, required) - task title
    - `description` (text) - detailed task description
    - `category` (text) - documentation, training, equipment, access, meeting
    - `priority` (text) - low, medium, high, critical
    - `assigned_to` (uuid) - who is responsible
    - `due_date` (date) - when task should be completed
    - `status` (text) - pending, in_progress, completed, skipped
    - `completed_at` (timestamptz) - completion timestamp
    - `completed_by` (uuid) - who completed the task
    - `order_index` (integer) - task ordering
    - `created_at` (timestamptz) - task creation
    - `updated_at` (timestamptz) - last update

  ### `training_modules`
    - `id` (uuid, primary key) - unique module identifier
    - `title` (text, required) - module title
    - `description` (text) - module description
    - `category` (text) - compliance, technical, soft_skills, product
    - `duration_minutes` (integer) - estimated completion time
    - `content_url` (text) - link to training content
    - `required` (boolean) - whether module is mandatory
    - `created_at` (timestamptz) - module creation
    - `updated_at` (timestamptz) - last update

  ### `training_completions`
    - `id` (uuid, primary key) - unique completion record
    - `user_id` (uuid, required) - references user who completed training
    - `training_module_id` (uuid, required) - references training_modules
    - `started_at` (timestamptz) - when training was started
    - `completed_at` (timestamptz) - when training was completed
    - `score` (integer) - assessment score if applicable
    - `passed` (boolean) - whether user passed
    - `certificate_url` (text) - link to completion certificate

  ## Relationships
    - onboarding_plans links to candidates and managers
    - onboarding_tasks links to plans
    - training_completions links users to modules

  ## Security
    - Enable RLS on all tables
    - HR staff can manage onboarding plans
    - Managers can view their team's onboarding
    - Employees can view their own onboarding tasks
    - Training is viewable by all authenticated users
*/

-- Create onboarding_plans table
CREATE TABLE IF NOT EXISTS onboarding_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  employee_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  start_date date NOT NULL,
  department text,
  position text,
  manager_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completion_percentage integer DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

-- Create onboarding_tasks table
CREATE TABLE IF NOT EXISTS onboarding_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_plan_id uuid NOT NULL REFERENCES onboarding_plans(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text DEFAULT 'general' CHECK (category IN ('documentation', 'training', 'equipment', 'access', 'meeting', 'general')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  due_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  completed_at timestamptz,
  completed_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create training_modules table
CREATE TABLE IF NOT EXISTS training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text DEFAULT 'general' CHECK (category IN ('compliance', 'technical', 'soft_skills', 'product', 'security', 'general')),
  duration_minutes integer DEFAULT 0,
  content_url text,
  required boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create training_completions table
CREATE TABLE IF NOT EXISTS training_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  training_module_id uuid NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  score integer CHECK (score >= 0 AND score <= 100),
  passed boolean DEFAULT false,
  certificate_url text,
  UNIQUE(user_id, training_module_id)
);

-- Enable RLS
ALTER TABLE onboarding_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_completions ENABLE ROW LEVEL SECURITY;

-- Onboarding Plans Policies

-- HR staff and managers can view onboarding plans
CREATE POLICY "HR staff and managers can view onboarding plans"
  ON onboarding_plans
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager', 'recruiter')
    )
    OR manager_id = auth.uid()
    OR employee_id = auth.uid()
  );

-- HR staff can create onboarding plans
CREATE POLICY "HR staff can create onboarding plans"
  ON onboarding_plans
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager')
    )
  );

-- HR staff and managers can update onboarding plans
CREATE POLICY "HR staff and managers can update onboarding plans"
  ON onboarding_plans
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager')
    )
    OR manager_id = auth.uid()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager')
    )
    OR manager_id = auth.uid()
  );

-- Onboarding Tasks Policies

-- Users can view tasks related to their onboarding or team
CREATE POLICY "Users can view relevant onboarding tasks"
  ON onboarding_tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM onboarding_plans op
      WHERE op.id = onboarding_plan_id
      AND (
        op.employee_id = auth.uid()
        OR op.manager_id = auth.uid()
        OR assigned_to = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE id = auth.uid() 
          AND role IN ('admin', 'hr_manager')
        )
      )
    )
  );

-- HR staff and managers can create tasks
CREATE POLICY "HR staff and managers can create tasks"
  ON onboarding_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager')
    )
  );

-- HR staff, managers, and assignees can update tasks
CREATE POLICY "Authorized users can update tasks"
  ON onboarding_tasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager')
    )
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM onboarding_plans op
      WHERE op.id = onboarding_plan_id
      AND op.manager_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager')
    )
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM onboarding_plans op
      WHERE op.id = onboarding_plan_id
      AND op.manager_id = auth.uid()
    )
  );

-- Training Modules Policies

-- All authenticated users can view training modules
CREATE POLICY "Authenticated users can view training modules"
  ON training_modules
  FOR SELECT
  TO authenticated
  USING (true);

-- Only HR staff can create training modules
CREATE POLICY "HR staff can create training modules"
  ON training_modules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager')
    )
  );

-- HR staff can update training modules
CREATE POLICY "HR staff can update training modules"
  ON training_modules
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager')
    )
  );

-- Training Completions Policies

-- Users can view their own completions, HR can view all
CREATE POLICY "Users can view relevant training completions"
  ON training_completions
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager')
    )
  );

-- Users can create their own completion records
CREATE POLICY "Users can create own training completions"
  ON training_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own completions
CREATE POLICY "Users can update own training completions"
  ON training_completions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_plans_employee ON onboarding_plans(employee_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_plans_manager ON onboarding_plans(manager_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_plans_status ON onboarding_plans(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_plans_start_date ON onboarding_plans(start_date);

CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_plan ON onboarding_tasks(onboarding_plan_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_assigned_to ON onboarding_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_status ON onboarding_tasks(status);
CREATE INDEX IF NOT EXISTS idx_onboarding_tasks_order ON onboarding_tasks(order_index);

CREATE INDEX IF NOT EXISTS idx_training_modules_category ON training_modules(category);
CREATE INDEX IF NOT EXISTS idx_training_modules_required ON training_modules(required);

CREATE INDEX IF NOT EXISTS idx_training_completions_user ON training_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_training_completions_module ON training_completions(training_module_id);

-- Create triggers for updated_at
CREATE TRIGGER update_onboarding_plans_updated_at
  BEFORE UPDATE ON onboarding_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_onboarding_tasks_updated_at
  BEFORE UPDATE ON onboarding_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_training_modules_updated_at
  BEFORE UPDATE ON training_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
