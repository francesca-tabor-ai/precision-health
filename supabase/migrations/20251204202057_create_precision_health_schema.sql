/*
  # Precision Medicine & Nutrition Platform - Core Schema

  ## Overview
  This migration creates the foundational database schema for a comprehensive precision medicine 
  and nutrition platform serving both humans and pets.

  ## New Tables
  
  ### 1. `profiles`
  Extended user profile information
  - `id` (uuid, FK to auth.users)
  - `full_name` (text)
  - `date_of_birth` (date)
  - `species_type` (text: 'human' or 'pet')
  - `pet_species` (text: for pets - 'dog', 'cat', etc.)
  - `pet_breed` (text)
  - `weight_kg` (decimal)
  - `height_cm` (decimal)
  - `biological_sex` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `biomarker_records`
  Stores lab work and biomarker data
  - `id` (uuid, PK)
  - `profile_id` (uuid, FK to profiles)
  - `test_date` (date)
  - `source_type` (text: 'pdf', 'photo', 'manual', 'integration')
  - `raw_data` (jsonb: original parsed data)
  - `processed_data` (jsonb: structured biomarkers)
  - `risk_level` (text: 'normal', 'caution', 'urgent')
  - `flagged_markers` (jsonb: array of concerning markers)
  - `created_at` (timestamptz)

  ### 3. `health_conditions`
  Identified or user-reported health conditions
  - `id` (uuid, PK)
  - `profile_id` (uuid, FK to profiles)
  - `condition_name` (text)
  - `condition_type` (text: 'diagnosed', 'suspected', 'risk')
  - `probability_score` (decimal)
  - `identified_from` (text: 'biomarkers', 'symptoms', 'user_reported')
  - `active` (boolean)
  - `notes` (text)
  - `created_at` (timestamptz)

  ### 4. `nutrition_recommendations`
  Personalized nutrition guidance
  - `id` (uuid, PK)
  - `profile_id` (uuid, FK to profiles)
  - `recommendation_type` (text: 'eat', 'avoid', 'caution')
  - `food_item` (text)
  - `category` (text: 'protein', 'vegetable', 'fruit', 'grain', 'dairy', etc.)
  - `rationale` (text)
  - `priority_level` (integer)
  - `active` (boolean)
  - `created_at` (timestamptz)

  ### 5. `supplement_protocols`
  Personalized supplement recommendations
  - `id` (uuid, PK)
  - `profile_id` (uuid, FK to profiles)
  - `supplement_name` (text)
  - `dosage` (text)
  - `frequency` (text)
  - `rationale` (text)
  - `safety_notes` (text)
  - `interactions` (jsonb: medication/supplement interactions)
  - `active` (boolean)
  - `created_at` (timestamptz)

  ### 6. `meal_plans`
  Generated meal plans
  - `id` (uuid, PK)
  - `profile_id` (uuid, FK to profiles)
  - `plan_name` (text)
  - `start_date` (date)
  - `end_date` (date)
  - `meals` (jsonb: structured meal data)
  - `nutritional_targets` (jsonb)
  - `adherence_score` (decimal)
  - `created_at` (timestamptz)

  ### 7. `lifestyle_tracking`
  Daily lifestyle and symptom logs
  - `id` (uuid, PK)
  - `profile_id` (uuid, FK to profiles)
  - `log_date` (date)
  - `log_type` (text: 'meal', 'symptom', 'exercise', 'sleep', 'medication', 'bowel', 'urine')
  - `data` (jsonb: flexible structure for different log types)
  - `notes` (text)
  - `created_at` (timestamptz)

  ### 8. `appointments`
  Healthcare appointments tracking
  - `id` (uuid, PK)
  - `profile_id` (uuid, FK to profiles)
  - `appointment_type` (text: 'gp', 'specialist', 'vet', 'lab', 'other')
  - `provider_name` (text)
  - `appointment_date` (timestamptz)
  - `status` (text: 'scheduled', 'completed', 'cancelled')
  - `notes` (text)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Users can only access their own profile data
  - Authenticated users can create and manage their own records
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  date_of_birth date,
  species_type text NOT NULL DEFAULT 'human',
  pet_species text,
  pet_breed text,
  weight_kg decimal,
  height_cm decimal,
  biological_sex text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_species_type CHECK (species_type IN ('human', 'pet'))
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create biomarker_records table
CREATE TABLE IF NOT EXISTS biomarker_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  test_date date NOT NULL,
  source_type text NOT NULL DEFAULT 'manual',
  raw_data jsonb,
  processed_data jsonb,
  risk_level text DEFAULT 'normal',
  flagged_markers jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_source_type CHECK (source_type IN ('pdf', 'photo', 'manual', 'integration')),
  CONSTRAINT valid_risk_level CHECK (risk_level IN ('normal', 'caution', 'urgent'))
);

ALTER TABLE biomarker_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own biomarker records"
  ON biomarker_records FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can insert own biomarker records"
  ON biomarker_records FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can update own biomarker records"
  ON biomarker_records FOR UPDATE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can delete own biomarker records"
  ON biomarker_records FOR DELETE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

-- Create health_conditions table
CREATE TABLE IF NOT EXISTS health_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  condition_name text NOT NULL,
  condition_type text NOT NULL DEFAULT 'risk',
  probability_score decimal,
  identified_from text NOT NULL,
  active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_condition_type CHECK (condition_type IN ('diagnosed', 'suspected', 'risk')),
  CONSTRAINT valid_identified_from CHECK (identified_from IN ('biomarkers', 'symptoms', 'user_reported'))
);

ALTER TABLE health_conditions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own health conditions"
  ON health_conditions FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can insert own health conditions"
  ON health_conditions FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can update own health conditions"
  ON health_conditions FOR UPDATE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can delete own health conditions"
  ON health_conditions FOR DELETE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

-- Create nutrition_recommendations table
CREATE TABLE IF NOT EXISTS nutrition_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recommendation_type text NOT NULL,
  food_item text NOT NULL,
  category text NOT NULL,
  rationale text,
  priority_level integer DEFAULT 1,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_recommendation_type CHECK (recommendation_type IN ('eat', 'avoid', 'caution'))
);

ALTER TABLE nutrition_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own nutrition recommendations"
  ON nutrition_recommendations FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can insert own nutrition recommendations"
  ON nutrition_recommendations FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can update own nutrition recommendations"
  ON nutrition_recommendations FOR UPDATE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can delete own nutrition recommendations"
  ON nutrition_recommendations FOR DELETE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

-- Create supplement_protocols table
CREATE TABLE IF NOT EXISTS supplement_protocols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  supplement_name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  rationale text,
  safety_notes text,
  interactions jsonb DEFAULT '[]'::jsonb,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE supplement_protocols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own supplement protocols"
  ON supplement_protocols FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can insert own supplement protocols"
  ON supplement_protocols FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can update own supplement protocols"
  ON supplement_protocols FOR UPDATE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can delete own supplement protocols"
  ON supplement_protocols FOR DELETE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

-- Create meal_plans table
CREATE TABLE IF NOT EXISTS meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  meals jsonb DEFAULT '[]'::jsonb,
  nutritional_targets jsonb DEFAULT '{}'::jsonb,
  adherence_score decimal,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal plans"
  ON meal_plans FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can insert own meal plans"
  ON meal_plans FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can update own meal plans"
  ON meal_plans FOR UPDATE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can delete own meal plans"
  ON meal_plans FOR DELETE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

-- Create lifestyle_tracking table
CREATE TABLE IF NOT EXISTS lifestyle_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  log_date date NOT NULL,
  log_type text NOT NULL,
  data jsonb NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_log_type CHECK (log_type IN ('meal', 'symptom', 'exercise', 'sleep', 'medication', 'bowel', 'urine'))
);

ALTER TABLE lifestyle_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own lifestyle tracking"
  ON lifestyle_tracking FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can insert own lifestyle tracking"
  ON lifestyle_tracking FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can update own lifestyle tracking"
  ON lifestyle_tracking FOR UPDATE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can delete own lifestyle tracking"
  ON lifestyle_tracking FOR DELETE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  appointment_type text NOT NULL,
  provider_name text NOT NULL,
  appointment_date timestamptz NOT NULL,
  status text DEFAULT 'scheduled',
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_appointment_type CHECK (appointment_type IN ('gp', 'specialist', 'vet', 'lab', 'other')),
  CONSTRAINT valid_status CHECK (status IN ('scheduled', 'completed', 'cancelled'))
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own appointments"
  ON appointments FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can insert own appointments"
  ON appointments FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can update own appointments"
  ON appointments FOR UPDATE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can delete own appointments"
  ON appointments FOR DELETE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_biomarker_records_profile_id ON biomarker_records(profile_id);
CREATE INDEX IF NOT EXISTS idx_biomarker_records_test_date ON biomarker_records(test_date DESC);
CREATE INDEX IF NOT EXISTS idx_health_conditions_profile_id ON health_conditions(profile_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_recommendations_profile_id ON nutrition_recommendations(profile_id);
CREATE INDEX IF NOT EXISTS idx_supplement_protocols_profile_id ON supplement_protocols(profile_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_profile_id ON meal_plans(profile_id);
CREATE INDEX IF NOT EXISTS idx_lifestyle_tracking_profile_id ON lifestyle_tracking(profile_id);
CREATE INDEX IF NOT EXISTS idx_lifestyle_tracking_log_date ON lifestyle_tracking(log_date DESC);
CREATE INDEX IF NOT EXISTS idx_appointments_profile_id ON appointments(profile_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date DESC);