/*
  # Precision Nutrition Engine Schema - Phase 5

  ## Overview
  This migration creates the foundational database schema for the Precision Nutrition Engine,
  including the Ingredient Knowledge Graph (IKG), recipe system, meal planning, and adherence tracking.

  ## New Tables

  ### 1. `ingredients`
  Core ingredient database with nutritional and safety data
  - `id` (uuid, PK)
  - `name` (text)
  - `category` (text: protein, vegetable, fruit, grain, dairy, etc.)
  - `nutritional_data` (jsonb: macros, micros, vitamins, minerals)
  - `species_safe` (jsonb: safety rules per species)
  - `toxicity_warnings` (jsonb: toxic components and thresholds)
  - `created_at` (timestamptz)

  ### 2. `ingredient_contraindications`
  Maps ingredients to conditions where they should be avoided or limited
  - `id` (uuid, PK)
  - `ingredient_id` (uuid, FK to ingredients)
  - `condition_name` (text)
  - `contraindication_type` (text: avoid, caution, limit)
  - `rationale` (text)
  - `max_daily_amount` (decimal)
  - `species_type` (text)

  ### 3. `ingredient_substitutions`
  Suggested substitutions for ingredients
  - `id` (uuid, PK)
  - `original_ingredient_id` (uuid, FK to ingredients)
  - `substitute_ingredient_id` (uuid, FK to ingredients)
  - `substitution_ratio` (decimal)
  - `notes` (text)

  ### 4. `recipes`
  Generated or curated recipes
  - `id` (uuid, PK)
  - `name` (text)
  - `description` (text)
  - `species_type` (text: human, dog, cat)
  - `ingredients` (jsonb: ingredient list with quantities)
  - `instructions` (text)
  - `prep_time_minutes` (integer)
  - `cook_time_minutes` (integer)
  - `servings` (integer)
  - `difficulty_level` (text: easy, medium, hard)
  - `nutritional_breakdown` (jsonb)
  - `condition_tags` (jsonb: conditions this recipe supports)
  - `cultural_tags` (jsonb)
  - `dietary_tags` (jsonb: vegan, gluten-free, etc.)
  - `created_at` (timestamptz)

  ### 5. `user_recipes`
  User-specific recipe recommendations and favorites
  - `id` (uuid, PK)
  - `profile_id` (uuid, FK to profiles)
  - `recipe_id` (uuid, FK to recipes)
  - `is_favorite` (boolean)
  - `adherence_score` (decimal: predicted likelihood)
  - `tried` (boolean)
  - `rating` (integer)
  - `notes` (text)
  - `created_at` (timestamptz)

  ### 6. `weekly_meal_plans`
  Generated weekly meal plans
  - `id` (uuid, PK)
  - `profile_id` (uuid, FK to profiles)
  - `plan_name` (text)
  - `start_date` (date)
  - `end_date` (date)
  - `meals_by_day` (jsonb: structured meal schedule)
  - `nutritional_targets` (jsonb)
  - `adherence_optimization_enabled` (boolean)
  - `status` (text: active, completed, archived)
  - `created_at` (timestamptz)

  ### 7. `shopping_lists`
  Auto-generated shopping lists from meal plans
  - `id` (uuid, PK)
  - `profile_id` (uuid, FK to profiles)
  - `meal_plan_id` (uuid, FK to weekly_meal_plans)
  - `items` (jsonb: ingredient name, quantity, unit, checked)
  - `notes` (text)
  - `status` (text: active, completed)
  - `created_at` (timestamptz)

  ### 8. `food_lookup_history`
  Track user food lookups and safety checks
  - `id` (uuid, PK)
  - `profile_id` (uuid, FK to profiles)
  - `food_name` (text)
  - `lookup_date` (timestamptz)
  - `safety_classification` (text: safe, caution, avoid)
  - `rationale` (text)
  - `ingredients_identified` (jsonb)

  ### 9. `user_food_preferences`
  User dietary preferences and restrictions
  - `id` (uuid, PK)
  - `profile_id` (uuid, FK to profiles)
  - `preference_type` (text: allergy, intolerance, dislike, cultural, ethical)
  - `food_item` (text)
  - `severity` (text: severe, moderate, mild)
  - `notes` (text)
  - `active` (boolean)
  - `created_at` (timestamptz)

  ## Security
  - RLS enabled on all tables
  - Users can only access their own data
  - Ingredient and recipe tables are globally readable
*/

-- Create ingredients table
CREATE TABLE IF NOT EXISTS ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text NOT NULL,
  nutritional_data jsonb DEFAULT '{}'::jsonb,
  species_safe jsonb DEFAULT '{}'::jsonb,
  toxicity_warnings jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ingredients_name ON ingredients(name);
CREATE INDEX IF NOT EXISTS idx_ingredients_category ON ingredients(category);

-- Create ingredient_contraindications table
CREATE TABLE IF NOT EXISTS ingredient_contraindications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  condition_name text NOT NULL,
  contraindication_type text NOT NULL,
  rationale text,
  max_daily_amount decimal,
  species_type text NOT NULL,
  CONSTRAINT valid_contraindication_type CHECK (contraindication_type IN ('avoid', 'caution', 'limit'))
);

CREATE INDEX IF NOT EXISTS idx_contraindications_ingredient ON ingredient_contraindications(ingredient_id);
CREATE INDEX IF NOT EXISTS idx_contraindications_condition ON ingredient_contraindications(condition_name);

-- Create ingredient_substitutions table
CREATE TABLE IF NOT EXISTS ingredient_substitutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  substitute_ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  substitution_ratio decimal DEFAULT 1.0,
  notes text
);

CREATE INDEX IF NOT EXISTS idx_substitutions_original ON ingredient_substitutions(original_ingredient_id);

-- Create recipes table
CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  species_type text NOT NULL DEFAULT 'human',
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  instructions text NOT NULL,
  prep_time_minutes integer,
  cook_time_minutes integer,
  servings integer,
  difficulty_level text DEFAULT 'medium',
  nutritional_breakdown jsonb DEFAULT '{}'::jsonb,
  condition_tags jsonb DEFAULT '[]'::jsonb,
  cultural_tags jsonb DEFAULT '[]'::jsonb,
  dietary_tags jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_species_type CHECK (species_type IN ('human', 'dog', 'cat')),
  CONSTRAINT valid_difficulty CHECK (difficulty_level IN ('easy', 'medium', 'hard'))
);

CREATE INDEX IF NOT EXISTS idx_recipes_species ON recipes(species_type);
CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON recipes(difficulty_level);

-- Create user_recipes table
CREATE TABLE IF NOT EXISTS user_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  is_favorite boolean DEFAULT false,
  adherence_score decimal,
  tried boolean DEFAULT false,
  rating integer,
  notes text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_rating CHECK (rating >= 1 AND rating <= 5),
  UNIQUE(profile_id, recipe_id)
);

ALTER TABLE user_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recipe interactions"
  ON user_recipes FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can insert own recipe interactions"
  ON user_recipes FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can update own recipe interactions"
  ON user_recipes FOR UPDATE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can delete own recipe interactions"
  ON user_recipes FOR DELETE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE INDEX IF NOT EXISTS idx_user_recipes_profile ON user_recipes(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_recipes_recipe ON user_recipes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_user_recipes_favorites ON user_recipes(profile_id, is_favorite) WHERE is_favorite = true;

-- Create weekly_meal_plans table
CREATE TABLE IF NOT EXISTS weekly_meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_name text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  meals_by_day jsonb NOT NULL DEFAULT '{}'::jsonb,
  nutritional_targets jsonb DEFAULT '{}'::jsonb,
  adherence_optimization_enabled boolean DEFAULT true,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('active', 'completed', 'archived'))
);

ALTER TABLE weekly_meal_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own meal plans"
  ON weekly_meal_plans FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can insert own meal plans"
  ON weekly_meal_plans FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can update own meal plans"
  ON weekly_meal_plans FOR UPDATE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can delete own meal plans"
  ON weekly_meal_plans FOR DELETE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE INDEX IF NOT EXISTS idx_meal_plans_profile ON weekly_meal_plans(profile_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_dates ON weekly_meal_plans(start_date, end_date);

-- Create shopping_lists table
CREATE TABLE IF NOT EXISTS shopping_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  meal_plan_id uuid REFERENCES weekly_meal_plans(id) ON DELETE SET NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  status text DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('active', 'completed'))
);

ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shopping lists"
  ON shopping_lists FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can insert own shopping lists"
  ON shopping_lists FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can update own shopping lists"
  ON shopping_lists FOR UPDATE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can delete own shopping lists"
  ON shopping_lists FOR DELETE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE INDEX IF NOT EXISTS idx_shopping_lists_profile ON shopping_lists(profile_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_meal_plan ON shopping_lists(meal_plan_id);

-- Create food_lookup_history table
CREATE TABLE IF NOT EXISTS food_lookup_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  food_name text NOT NULL,
  lookup_date timestamptz DEFAULT now(),
  safety_classification text NOT NULL,
  rationale text,
  ingredients_identified jsonb DEFAULT '[]'::jsonb,
  CONSTRAINT valid_safety CHECK (safety_classification IN ('safe', 'caution', 'avoid'))
);

ALTER TABLE food_lookup_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own food lookups"
  ON food_lookup_history FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can insert own food lookups"
  ON food_lookup_history FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE INDEX IF NOT EXISTS idx_food_lookup_profile ON food_lookup_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_food_lookup_date ON food_lookup_history(lookup_date DESC);

-- Create user_food_preferences table
CREATE TABLE IF NOT EXISTS user_food_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  preference_type text NOT NULL,
  food_item text NOT NULL,
  severity text,
  notes text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_preference_type CHECK (preference_type IN ('allergy', 'intolerance', 'dislike', 'cultural', 'ethical')),
  CONSTRAINT valid_severity CHECK (severity IN ('severe', 'moderate', 'mild'))
);

ALTER TABLE user_food_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own food preferences"
  ON user_food_preferences FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can insert own food preferences"
  ON user_food_preferences FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can update own food preferences"
  ON user_food_preferences FOR UPDATE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can delete own food preferences"
  ON user_food_preferences FOR DELETE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE INDEX IF NOT EXISTS idx_food_preferences_profile ON user_food_preferences(profile_id);
CREATE INDEX IF NOT EXISTS idx_food_preferences_active ON user_food_preferences(profile_id, active) WHERE active = true;

-- Insert sample ingredients for demonstration
INSERT INTO ingredients (name, category, nutritional_data, species_safe, toxicity_warnings)
VALUES
  ('Salmon', 'protein', '{"protein": 25, "fat": 12, "omega3": 2.5, "vitamin_d": 15}'::jsonb, '{"human": true, "dog": true, "cat": true}'::jsonb, '[]'::jsonb),
  ('Chicken Breast', 'protein', '{"protein": 31, "fat": 3.6, "iron": 0.9}'::jsonb, '{"human": true, "dog": true, "cat": true}'::jsonb, '[]'::jsonb),
  ('Spinach', 'vegetable', '{"iron": 2.7, "vitamin_k": 483, "folate": 194}'::jsonb, '{"human": true, "dog": true, "cat": true}'::jsonb, '[]'::jsonb),
  ('Sweet Potato', 'vegetable', '{"carbs": 20, "fiber": 3, "vitamin_a": 14187, "vitamin_c": 2.4}'::jsonb, '{"human": true, "dog": true, "cat": false}'::jsonb, '[]'::jsonb),
  ('Blueberries', 'fruit', '{"fiber": 2.4, "vitamin_c": 9.7, "antioxidants": "high"}'::jsonb, '{"human": true, "dog": true, "cat": true}'::jsonb, '[]'::jsonb),
  ('Onion', 'vegetable', '{"vitamin_c": 7.4, "folate": 19}'::jsonb, '{"human": true, "dog": false, "cat": false}'::jsonb, '[{"species": ["dog", "cat"], "compound": "thiosulfate", "effect": "hemolytic_anemia"}]'::jsonb),
  ('Garlic', 'vegetable', '{"vitamin_c": 31, "manganese": 1.7}'::jsonb, '{"human": true, "dog": false, "cat": false}'::jsonb, '[{"species": ["dog", "cat"], "compound": "thiosulfate", "effect": "hemolytic_anemia"}]'::jsonb),
  ('Quinoa', 'grain', '{"protein": 14, "fiber": 7, "iron": 4.6, "magnesium": 197}'::jsonb, '{"human": true, "dog": true, "cat": true}'::jsonb, '[]'::jsonb),
  ('Broccoli', 'vegetable', '{"vitamin_c": 89, "vitamin_k": 102, "folate": 63}'::jsonb, '{"human": true, "dog": true, "cat": true}'::jsonb, '[]'::jsonb),
  ('Greek Yogurt', 'dairy', '{"protein": 10, "calcium": 110, "probiotics": "high"}'::jsonb, '{"human": true, "dog": true, "cat": true}'::jsonb, '[]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Insert sample contraindications
INSERT INTO ingredient_contraindications (ingredient_id, condition_name, contraindication_type, rationale, species_type)
SELECT 
  id,
  'Chronic Kidney Disease',
  'limit',
  'High phosphorus content should be limited in CKD patients',
  'human'
FROM ingredients WHERE name = 'Salmon'
ON CONFLICT DO NOTHING;

INSERT INTO ingredient_contraindications (ingredient_id, condition_name, contraindication_type, rationale, species_type)
SELECT 
  id,
  'Chronic Kidney Disease',
  'avoid',
  'Toxic to dogs and cats, causes hemolytic anemia',
  'dog'
FROM ingredients WHERE name = 'Onion'
ON CONFLICT DO NOTHING;

-- Insert sample recipes
INSERT INTO recipes (name, description, species_type, ingredients, instructions, prep_time_minutes, cook_time_minutes, servings, difficulty_level, condition_tags, dietary_tags)
VALUES
  (
    'Omega-3 Rich Salmon Bowl',
    'Heart-healthy salmon with quinoa and vegetables, rich in omega-3 fatty acids',
    'human',
    '[{"ingredient": "Salmon", "quantity": 6, "unit": "oz"}, {"ingredient": "Quinoa", "quantity": 1, "unit": "cup"}, {"ingredient": "Broccoli", "quantity": 1, "unit": "cup"}, {"ingredient": "Spinach", "quantity": 2, "unit": "cups"}]'::jsonb,
    '1. Cook quinoa according to package instructions. 2. Season salmon with herbs and bake at 400°F for 12-15 minutes. 3. Steam broccoli until tender. 4. Assemble bowl with quinoa base, add salmon, broccoli, and fresh spinach.',
    10,
    15,
    2,
    'easy',
    '["heart health", "inflammation", "omega-3 deficiency"]'::jsonb,
    '["gluten-free", "high-protein"]'::jsonb
  ),
  (
    'Chicken & Sweet Potato Bowl',
    'Simple, digestible meal for dogs with sensitive stomachs',
    'dog',
    '[{"ingredient": "Chicken Breast", "quantity": 8, "unit": "oz"}, {"ingredient": "Sweet Potato", "quantity": 2, "unit": "medium"}, {"ingredient": "Blueberries", "quantity": 0.25, "unit": "cup"}]'::jsonb,
    '1. Boil chicken breast until fully cooked, then dice. 2. Bake sweet potato until soft, mash. 3. Mix chicken, sweet potato, and blueberries. 4. Let cool before serving.',
    10,
    25,
    4,
    'easy',
    '["digestive health", "immune support"]'::jsonb,
    '["grain-free", "limited-ingredient"]'::jsonb
  )
ON CONFLICT DO NOTHING;