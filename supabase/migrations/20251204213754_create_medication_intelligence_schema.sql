/*
  # Medication Intelligence Schema - Phase 4 Continuation

  ## Overview
  This migration adds medication tracking, interaction detection, test tracking,
  clinical notes, and pre-appointment summaries to complete Phase 4.

  ## New Tables

  ### 1. `upcoming_tests` - Track required medical tests
  ### 2. `clinical_notes` - Doctor/vet notes with AI parsing
  ### 3. `medications` - Medication database
  ### 4. `user_medications` - User medication schedule
  ### 5. `medication_doses` - Track adherence
  ### 6. `medication_interactions` - Interaction database
  ### 7. `user_interaction_alerts` - Active warnings
  ### 8. `pre_appointment_summaries` - Medical summaries
  ### 9. `medication_adherence_patterns` - Adherence trends

  ## Security
  - RLS enabled on all user-specific tables
  - Medication database globally readable
*/

-- Extend appointments table with Phase 4 fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'provider_specialty'
  ) THEN
    ALTER TABLE appointments ADD COLUMN provider_specialty text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'duration_minutes'
  ) THEN
    ALTER TABLE appointments ADD COLUMN duration_minutes integer DEFAULT 30;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'location'
  ) THEN
    ALTER TABLE appointments ADD COLUMN location text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'reason'
  ) THEN
    ALTER TABLE appointments ADD COLUMN reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'reminder_sent'
  ) THEN
    ALTER TABLE appointments ADD COLUMN reminder_sent boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'calendar_event_id'
  ) THEN
    ALTER TABLE appointments ADD COLUMN calendar_event_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'appointments' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE appointments ADD COLUMN completed_at timestamptz;
  END IF;
END $$;

-- Update appointment_type constraint to include new types
DO $$
BEGIN
  ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_appointment_type_check;
  ALTER TABLE appointments ADD CONSTRAINT appointments_appointment_type_check 
    CHECK (appointment_type IN ('gp', 'specialist', 'hospital', 'lab', 'vet', 'home_care'));
  
  ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_status_check;
  ALTER TABLE appointments ADD CONSTRAINT appointments_status_check 
    CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show'));
END $$;

-- Create upcoming_tests table
CREATE TABLE IF NOT EXISTS upcoming_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  test_type text NOT NULL,
  test_name text NOT NULL,
  reason text,
  recommended_date date,
  predicted_date date,
  status text DEFAULT 'pending',
  priority text DEFAULT 'routine',
  related_biomarker_ids jsonb DEFAULT '[]'::jsonb,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  CONSTRAINT valid_test_type CHECK (test_type IN ('blood', 'imaging', 'urine', 'stool', 'veterinary', 'other')),
  CONSTRAINT valid_test_status CHECK (status IN ('pending', 'scheduled', 'completed', 'overdue')),
  CONSTRAINT valid_test_priority CHECK (priority IN ('routine', 'important', 'urgent'))
);

ALTER TABLE upcoming_tests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tests"
  ON upcoming_tests FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can insert own tests"
  ON upcoming_tests FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can update own tests"
  ON upcoming_tests FOR UPDATE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can delete own tests"
  ON upcoming_tests FOR DELETE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE INDEX IF NOT EXISTS idx_tests_profile ON upcoming_tests(profile_id);
CREATE INDEX IF NOT EXISTS idx_tests_status ON upcoming_tests(status);
CREATE INDEX IF NOT EXISTS idx_tests_date ON upcoming_tests(recommended_date);

-- Create clinical_notes table
CREATE TABLE IF NOT EXISTS clinical_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  note_type text NOT NULL,
  provider_name text,
  note_date date NOT NULL,
  raw_text text,
  image_url text,
  parsed_data jsonb DEFAULT '{}'::jsonb,
  diagnoses jsonb DEFAULT '[]'::jsonb,
  medications_prescribed jsonb DEFAULT '[]'::jsonb,
  tests_ordered jsonb DEFAULT '[]'::jsonb,
  follow_up_instructions text,
  parsing_confidence decimal DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_note_type CHECK (note_type IN ('doctor', 'vet', 'hospital', 'lab_report'))
);

ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notes"
  ON clinical_notes FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can insert own notes"
  ON clinical_notes FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can update own notes"
  ON clinical_notes FOR UPDATE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE INDEX IF NOT EXISTS idx_notes_profile ON clinical_notes(profile_id);
CREATE INDEX IF NOT EXISTS idx_notes_date ON clinical_notes(note_date);

-- Create medications table
CREATE TABLE IF NOT EXISTS medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  generic_name text,
  brand_names jsonb DEFAULT '[]'::jsonb,
  medication_class text,
  species text DEFAULT 'human',
  common_dosages jsonb DEFAULT '[]'::jsonb,
  administration_routes jsonb DEFAULT '["oral"]'::jsonb,
  contraindications jsonb DEFAULT '[]'::jsonb,
  side_effects jsonb DEFAULT '[]'::jsonb,
  toxicity_warnings jsonb DEFAULT '[]'::jsonb,
  requires_prescription boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_med_species CHECK (species IN ('human', 'dog', 'cat', 'all'))
);

CREATE INDEX IF NOT EXISTS idx_medications_name ON medications(name);
CREATE INDEX IF NOT EXISTS idx_medications_species ON medications(species);

-- Create user_medications table
CREATE TABLE IF NOT EXISTS user_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  medication_id uuid REFERENCES medications(id) ON DELETE SET NULL,
  medication_name text NOT NULL,
  dosage text NOT NULL,
  dosage_amount decimal,
  dosage_unit text,
  frequency text NOT NULL,
  schedule_times jsonb DEFAULT '[]'::jsonb,
  start_date date NOT NULL,
  end_date date,
  prescribing_provider text,
  reason text,
  special_instructions text,
  active boolean DEFAULT true,
  recognition_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE user_medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own medications"
  ON user_medications FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can insert own medications"
  ON user_medications FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can update own medications"
  ON user_medications FOR UPDATE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can delete own medications"
  ON user_medications FOR DELETE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE INDEX IF NOT EXISTS idx_user_medications_profile ON user_medications(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_medications_active ON user_medications(active) WHERE active = true;

-- Create medication_doses table
CREATE TABLE IF NOT EXISTS medication_doses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_medication_id uuid NOT NULL REFERENCES user_medications(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_time timestamptz NOT NULL,
  taken_time timestamptz,
  status text DEFAULT 'scheduled',
  missed_reason text,
  reminder_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_dose_status CHECK (status IN ('scheduled', 'taken', 'missed', 'skipped'))
);

ALTER TABLE medication_doses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own doses"
  ON medication_doses FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can insert own doses"
  ON medication_doses FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can update own doses"
  ON medication_doses FOR UPDATE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE INDEX IF NOT EXISTS idx_doses_user_medication ON medication_doses(user_medication_id);
CREATE INDEX IF NOT EXISTS idx_doses_scheduled ON medication_doses(scheduled_time);
CREATE INDEX IF NOT EXISTS idx_doses_status ON medication_doses(status);

-- Create medication_interactions table
CREATE TABLE IF NOT EXISTS medication_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_type text NOT NULL,
  medication_id_1 uuid REFERENCES medications(id) ON DELETE CASCADE,
  medication_id_2 uuid REFERENCES medications(id) ON DELETE CASCADE,
  interacting_substance text,
  severity text NOT NULL,
  effect text NOT NULL,
  mechanism text,
  recommendation text NOT NULL,
  species_specific jsonb DEFAULT '{}'::jsonb,
  source_references jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT valid_interaction_type CHECK (interaction_type IN ('drug_drug', 'drug_food', 'drug_supplement')),
  CONSTRAINT valid_int_severity CHECK (severity IN ('minor', 'moderate', 'major', 'severe'))
);

CREATE INDEX IF NOT EXISTS idx_interactions_med1 ON medication_interactions(medication_id_1);
CREATE INDEX IF NOT EXISTS idx_interactions_med2 ON medication_interactions(medication_id_2);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON medication_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_severity ON medication_interactions(severity);

-- Create user_interaction_alerts table
CREATE TABLE IF NOT EXISTS user_interaction_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  interaction_id uuid REFERENCES medication_interactions(id) ON DELETE CASCADE,
  user_medication_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  alert_type text NOT NULL,
  severity text NOT NULL,
  message text NOT NULL,
  recommendation text NOT NULL,
  acknowledged boolean DEFAULT false,
  dismissed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  acknowledged_at timestamptz,
  CONSTRAINT valid_alert_type CHECK (alert_type IN ('drug_drug', 'drug_food', 'drug_supplement'))
);

ALTER TABLE user_interaction_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
  ON user_interaction_alerts FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can update own alerts"
  ON user_interaction_alerts FOR UPDATE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE INDEX IF NOT EXISTS idx_alerts_profile ON user_interaction_alerts(profile_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON user_interaction_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_acknowledged ON user_interaction_alerts(acknowledged) WHERE acknowledged = false;

-- Create pre_appointment_summaries table
CREATE TABLE IF NOT EXISTS pre_appointment_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE CASCADE,
  summary_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  recent_biomarkers jsonb DEFAULT '[]'::jsonb,
  nutrition_status jsonb DEFAULT '{}'::jsonb,
  symptoms_logged jsonb DEFAULT '[]'::jsonb,
  medication_adherence jsonb DEFAULT '{}'::jsonb,
  red_flags jsonb DEFAULT '[]'::jsonb,
  share_link text,
  share_expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE pre_appointment_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own summaries"
  ON pre_appointment_summaries FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can insert own summaries"
  ON pre_appointment_summaries FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE INDEX IF NOT EXISTS idx_summaries_profile ON pre_appointment_summaries(profile_id);
CREATE INDEX IF NOT EXISTS idx_summaries_appointment ON pre_appointment_summaries(appointment_id);

-- Create medication_adherence_patterns table
CREATE TABLE IF NOT EXISTS medication_adherence_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_medication_id uuid NOT NULL REFERENCES user_medications(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  doses_scheduled integer DEFAULT 0,
  doses_taken integer DEFAULT 0,
  doses_missed integer DEFAULT 0,
  adherence_rate decimal DEFAULT 0,
  missed_dose_patterns jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE medication_adherence_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own adherence patterns"
  ON medication_adherence_patterns FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE INDEX IF NOT EXISTS idx_adherence_profile ON medication_adherence_patterns(profile_id);
CREATE INDEX IF NOT EXISTS idx_adherence_medication ON medication_adherence_patterns(user_medication_id);

-- Insert sample medications
INSERT INTO medications (name, generic_name, medication_class, species, common_dosages, requires_prescription)
VALUES
  ('Levothyroxine', 'Levothyroxine Sodium', 'Thyroid Hormone', 'human', '["25mcg", "50mcg", "75mcg", "100mcg"]'::jsonb, true),
  ('Metformin', 'Metformin HCL', 'Antidiabetic', 'human', '["500mg", "850mg", "1000mg"]'::jsonb, true),
  ('Lisinopril', 'Lisinopril', 'ACE Inhibitor', 'human', '["5mg", "10mg", "20mg", "40mg"]'::jsonb, true),
  ('Omega-3 Fish Oil', 'EPA/DHA', 'Supplement', 'all', '["1000mg", "2000mg"]'::jsonb, false),
  ('Carprofen', 'Carprofen', 'NSAID', 'dog', '["25mg", "75mg", "100mg"]'::jsonb, true),
  ('Gabapentin', 'Gabapentin', 'Anticonvulsant/Pain', 'cat', '["50mg", "100mg"]'::jsonb, true)
ON CONFLICT DO NOTHING;

-- Insert sample drug interactions
DO $$
DECLARE
  levo_id uuid;
  metformin_id uuid;
BEGIN
  SELECT id INTO levo_id FROM medications WHERE name = 'Levothyroxine' LIMIT 1;
  SELECT id INTO metformin_id FROM medications WHERE name = 'Metformin' LIMIT 1;

  IF levo_id IS NOT NULL THEN
    INSERT INTO medication_interactions (
      interaction_type, medication_id_1, interacting_substance, severity, effect, recommendation
    )
    VALUES
      ('drug_food', levo_id, 'Calcium-rich foods', 'moderate', 'Reduces absorption of thyroid medication', 'Take levothyroxine 4 hours before or after calcium-rich foods'),
      ('drug_food', levo_id, 'Coffee', 'minor', 'May reduce absorption', 'Take with water only, wait 30 minutes before coffee'),
      ('drug_supplement', levo_id, 'Iron supplements', 'major', 'Significantly reduces thyroid hormone absorption', 'Space doses at least 4 hours apart')
    ON CONFLICT DO NOTHING;
  END IF;

  IF metformin_id IS NOT NULL THEN
    INSERT INTO medication_interactions (
      interaction_type, medication_id_1, interacting_substance, severity, effect, recommendation
    )
    VALUES
      ('drug_supplement', metformin_id, 'Vitamin B12', 'moderate', 'Metformin can deplete B12 levels', 'Consider B12 supplementation and regular monitoring')
    ON CONFLICT DO NOTHING;
  END IF;
END $$;