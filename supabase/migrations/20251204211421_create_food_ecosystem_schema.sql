/*
  # Precision Delivery & Food Ecosystem Schema - Phase 6

  ## Overview
  This migration creates the database schema for restaurant delivery intelligence and
  precision grocery automation, including menu ingestion, dish risk assessment, grocery
  product cataloging, and order management.

  ## New Tables

  ### 1. `restaurants`
  Restaurant and delivery platform data
  - `id` (uuid, PK)
  - `name` (text)
  - `cuisine_type` (text)
  - `delivery_platform` (text: deliveroo, uber_eats, just_eat, etc.)
  - `location` (text)
  - `rating` (decimal)
  - `delivery_time_minutes` (integer)
  - `minimum_order` (decimal)
  - `delivery_fee` (decimal)
  - `is_clinical_partner` (boolean: offers medical menu co-development)
  - `metadata` (jsonb: hours, contact, etc.)
  - `created_at` (timestamptz)

  ### 2. `dishes`
  Restaurant dishes with ingredient and nutritional data
  - `id` (uuid, PK)
  - `restaurant_id` (uuid, FK to restaurants)
  - `name` (text)
  - `description` (text)
  - `ingredients` (jsonb: parsed ingredient list)
  - `allergens` (jsonb)
  - `nutritional_info` (jsonb)
  - `price` (decimal)
  - `category` (text: starter, main, dessert, etc.)
  - `cuisine_tags` (jsonb)
  - `image_url` (text)
  - `available` (boolean)
  - `created_at` (timestamptz)

  ### 3. `dish_risk_assessments`
  Personalized risk scoring for dishes per user
  - `id` (uuid, PK)
  - `profile_id` (uuid, FK to profiles)
  - `dish_id` (uuid, FK to dishes)
  - `risk_classification` (text: safe, beneficial, neutral, caution, avoid)
  - `risk_score` (decimal: 0-100)
  - `rationale` (text)
  - `contraindications` (jsonb)
  - `recommended_substitutions` (jsonb)
  - `assessed_at` (timestamptz)

  ### 4. `grocery_stores`
  Supermarket and grocery store data
  - `id` (uuid, PK)
  - `name` (text: Ocado, Tesco, Waitrose, etc.)
  - `region` (text)
  - `delivery_available` (boolean)
  - `api_available` (boolean)
  - `checkout_integration_type` (text: api, redirect, manual)
  - `logo_url` (text)
  - `created_at` (timestamptz)

  ### 5. `grocery_products`
  Grocery products with ingredient mapping
  - `id` (uuid, PK)
  - `store_id` (uuid, FK to grocery_stores)
  - `sku` (text)
  - `name` (text)
  - `brand` (text)
  - `category` (text)
  - `ingredients` (jsonb)
  - `nutritional_info` (jsonb)
  - `price` (decimal)
  - `unit` (text)
  - `in_stock` (boolean)
  - `image_url` (text)
  - `product_url` (text)
  - `last_updated` (timestamptz)

  ### 6. `grocery_product_mappings`
  Maps grocery products to IKG ingredients
  - `id` (uuid, PK)
  - `product_id` (uuid, FK to grocery_products)
  - `ingredient_id` (uuid, FK to ingredients)
  - `confidence_score` (decimal: 0-1)

  ### 7. `smart_shopping_lists`
  AI-generated, condition-safe shopping lists
  - `id` (uuid, PK)
  - `profile_id` (uuid, FK to profiles)
  - `name` (text)
  - `store_id` (uuid, FK to grocery_stores)
  - `source_meal_plan_id` (uuid, FK to weekly_meal_plans)
  - `items` (jsonb: products with quantities, substitutions)
  - `total_cost` (decimal)
  - `list_type` (text: weekly, monthly, budget, organic, quick)
  - `status` (text: draft, ready, ordered, delivered)
  - `checkout_url` (text)
  - `created_at` (timestamptz)
  - `ordered_at` (timestamptz)

  ### 8. `restaurant_orders`
  Track restaurant delivery orders
  - `id` (uuid, PK)
  - `profile_id` (uuid, FK to profiles)
  - `restaurant_id` (uuid, FK to restaurants)
  - `dishes` (jsonb: ordered dishes with customizations)
  - `total_cost` (decimal)
  - `delivery_platform` (text)
  - `order_status` (text: pending, confirmed, preparing, delivered, cancelled)
  - `delivery_time` (timestamptz)
  - `special_instructions` (text)
  - `safety_verified` (boolean)
  - `created_at` (timestamptz)

  ### 9. `user_restaurant_preferences`
  User preferences for restaurants and cuisines
  - `id` (uuid, PK)
  - `profile_id` (uuid, FK to profiles)
  - `preferred_cuisines` (jsonb)
  - `excluded_cuisines` (jsonb)
  - `max_delivery_time` (integer)
  - `max_delivery_fee` (decimal)
  - `dietary_preferences` (jsonb)

  ### 10. `clinical_menu_submissions`
  Restaurant submissions for clinical menu approval
  - `id` (uuid, PK)
  - `restaurant_id` (uuid, FK to restaurants)
  - `dish_name` (text)
  - `recipe_data` (jsonb)
  - `target_conditions` (jsonb)
  - `nutritional_targets` (jsonb)
  - `submission_status` (text: pending, approved, rejected, revision_requested)
  - `feedback` (text)
  - `submitted_at` (timestamptz)
  - `reviewed_at` (timestamptz)

  ## Security
  - RLS enabled on all user-specific tables
  - Restaurant and product data globally readable
  - Only users can access their own risk assessments and orders
*/

-- Create restaurants table
CREATE TABLE IF NOT EXISTS restaurants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  cuisine_type text,
  delivery_platform text NOT NULL,
  location text,
  rating decimal DEFAULT 0,
  delivery_time_minutes integer,
  minimum_order decimal DEFAULT 0,
  delivery_fee decimal DEFAULT 0,
  is_clinical_partner boolean DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_restaurants_platform ON restaurants(delivery_platform);
CREATE INDEX IF NOT EXISTS idx_restaurants_cuisine ON restaurants(cuisine_type);
CREATE INDEX IF NOT EXISTS idx_restaurants_clinical ON restaurants(is_clinical_partner) WHERE is_clinical_partner = true;

-- Create dishes table
CREATE TABLE IF NOT EXISTS dishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  ingredients jsonb DEFAULT '[]'::jsonb,
  allergens jsonb DEFAULT '[]'::jsonb,
  nutritional_info jsonb DEFAULT '{}'::jsonb,
  price decimal NOT NULL,
  category text,
  cuisine_tags jsonb DEFAULT '[]'::jsonb,
  image_url text,
  available boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dishes_restaurant ON dishes(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_dishes_category ON dishes(category);
CREATE INDEX IF NOT EXISTS idx_dishes_available ON dishes(available) WHERE available = true;

-- Create dish_risk_assessments table
CREATE TABLE IF NOT EXISTS dish_risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dish_id uuid NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  risk_classification text NOT NULL,
  risk_score decimal DEFAULT 0,
  rationale text,
  contraindications jsonb DEFAULT '[]'::jsonb,
  recommended_substitutions jsonb DEFAULT '[]'::jsonb,
  assessed_at timestamptz DEFAULT now(),
  CONSTRAINT valid_risk_classification CHECK (risk_classification IN ('safe', 'beneficial', 'neutral', 'caution', 'avoid')),
  UNIQUE(profile_id, dish_id)
);

ALTER TABLE dish_risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dish assessments"
  ON dish_risk_assessments FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can insert own dish assessments"
  ON dish_risk_assessments FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE INDEX IF NOT EXISTS idx_dish_assessments_profile ON dish_risk_assessments(profile_id);
CREATE INDEX IF NOT EXISTS idx_dish_assessments_dish ON dish_risk_assessments(dish_id);
CREATE INDEX IF NOT EXISTS idx_dish_assessments_classification ON dish_risk_assessments(risk_classification);

-- Create grocery_stores table
CREATE TABLE IF NOT EXISTS grocery_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  region text DEFAULT 'UK',
  delivery_available boolean DEFAULT true,
  api_available boolean DEFAULT false,
  checkout_integration_type text DEFAULT 'redirect',
  logo_url text,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_checkout_type CHECK (checkout_integration_type IN ('api', 'redirect', 'manual'))
);

-- Create grocery_products table
CREATE TABLE IF NOT EXISTS grocery_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES grocery_stores(id) ON DELETE CASCADE,
  sku text NOT NULL,
  name text NOT NULL,
  brand text,
  category text,
  ingredients jsonb DEFAULT '[]'::jsonb,
  nutritional_info jsonb DEFAULT '{}'::jsonb,
  price decimal NOT NULL,
  unit text,
  in_stock boolean DEFAULT true,
  image_url text,
  product_url text,
  last_updated timestamptz DEFAULT now(),
  UNIQUE(store_id, sku)
);

CREATE INDEX IF NOT EXISTS idx_grocery_products_store ON grocery_products(store_id);
CREATE INDEX IF NOT EXISTS idx_grocery_products_category ON grocery_products(category);
CREATE INDEX IF NOT EXISTS idx_grocery_products_stock ON grocery_products(in_stock) WHERE in_stock = true;
CREATE INDEX IF NOT EXISTS idx_grocery_products_name ON grocery_products(name);

-- Create grocery_product_mappings table
CREATE TABLE IF NOT EXISTS grocery_product_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES grocery_products(id) ON DELETE CASCADE,
  ingredient_id uuid NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  confidence_score decimal DEFAULT 0.5,
  UNIQUE(product_id, ingredient_id)
);

CREATE INDEX IF NOT EXISTS idx_product_mappings_product ON grocery_product_mappings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_mappings_ingredient ON grocery_product_mappings(ingredient_id);

-- Create smart_shopping_lists table
CREATE TABLE IF NOT EXISTS smart_shopping_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  store_id uuid REFERENCES grocery_stores(id) ON DELETE SET NULL,
  source_meal_plan_id uuid REFERENCES weekly_meal_plans(id) ON DELETE SET NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_cost decimal DEFAULT 0,
  list_type text DEFAULT 'weekly',
  status text DEFAULT 'draft',
  checkout_url text,
  created_at timestamptz DEFAULT now(),
  ordered_at timestamptz,
  CONSTRAINT valid_list_type CHECK (list_type IN ('weekly', 'monthly', 'budget', 'organic', 'quick')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'ready', 'ordered', 'delivered'))
);

ALTER TABLE smart_shopping_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own shopping lists"
  ON smart_shopping_lists FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can insert own shopping lists"
  ON smart_shopping_lists FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can update own shopping lists"
  ON smart_shopping_lists FOR UPDATE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can delete own shopping lists"
  ON smart_shopping_lists FOR DELETE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE INDEX IF NOT EXISTS idx_shopping_lists_profile ON smart_shopping_lists(profile_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_status ON smart_shopping_lists(status);

-- Create restaurant_orders table
CREATE TABLE IF NOT EXISTS restaurant_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  dishes jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_cost decimal DEFAULT 0,
  delivery_platform text,
  order_status text DEFAULT 'pending',
  delivery_time timestamptz,
  special_instructions text,
  safety_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_order_status CHECK (order_status IN ('pending', 'confirmed', 'preparing', 'delivered', 'cancelled'))
);

ALTER TABLE restaurant_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own restaurant orders"
  ON restaurant_orders FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can insert own restaurant orders"
  ON restaurant_orders FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can update own restaurant orders"
  ON restaurant_orders FOR UPDATE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE INDEX IF NOT EXISTS idx_restaurant_orders_profile ON restaurant_orders(profile_id);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_status ON restaurant_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_restaurant_orders_restaurant ON restaurant_orders(restaurant_id);

-- Create user_restaurant_preferences table
CREATE TABLE IF NOT EXISTS user_restaurant_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  preferred_cuisines jsonb DEFAULT '[]'::jsonb,
  excluded_cuisines jsonb DEFAULT '[]'::jsonb,
  max_delivery_time integer,
  max_delivery_fee decimal,
  dietary_preferences jsonb DEFAULT '[]'::jsonb
);

ALTER TABLE user_restaurant_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own restaurant preferences"
  ON user_restaurant_preferences FOR SELECT
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can insert own restaurant preferences"
  ON user_restaurant_preferences FOR INSERT
  TO authenticated
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

CREATE POLICY "Users can update own restaurant preferences"
  ON user_restaurant_preferences FOR UPDATE
  TO authenticated
  USING (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id))
  WITH CHECK (profile_id IN (SELECT id FROM profiles WHERE auth.uid() = id));

-- Create clinical_menu_submissions table
CREATE TABLE IF NOT EXISTS clinical_menu_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  dish_name text NOT NULL,
  recipe_data jsonb NOT NULL,
  target_conditions jsonb DEFAULT '[]'::jsonb,
  nutritional_targets jsonb DEFAULT '{}'::jsonb,
  submission_status text DEFAULT 'pending',
  feedback text,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  CONSTRAINT valid_submission_status CHECK (submission_status IN ('pending', 'approved', 'rejected', 'revision_requested'))
);

CREATE INDEX IF NOT EXISTS idx_clinical_submissions_restaurant ON clinical_menu_submissions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_clinical_submissions_status ON clinical_menu_submissions(submission_status);

-- Insert sample grocery stores
INSERT INTO grocery_stores (name, region, delivery_available, api_available, checkout_integration_type)
VALUES
  ('Ocado', 'UK', true, false, 'redirect'),
  ('Tesco', 'UK', true, false, 'redirect'),
  ('Waitrose', 'UK', true, false, 'redirect'),
  ('Sainsburys', 'UK', true, false, 'redirect'),
  ('Morrisons', 'UK', true, false, 'redirect'),
  ('Asda', 'UK', true, false, 'redirect')
ON CONFLICT (name) DO NOTHING;

-- Insert sample restaurants
INSERT INTO restaurants (name, cuisine_type, delivery_platform, location, rating, delivery_time_minutes, minimum_order, delivery_fee, is_clinical_partner)
VALUES
  ('The Healthy Kitchen', 'Health Food', 'deliveroo', 'London', 4.5, 30, 10.00, 2.99, true),
  ('Green Bowl', 'Vegetarian', 'uber_eats', 'London', 4.7, 25, 12.00, 3.49, false),
  ('Mediterranean Delight', 'Mediterranean', 'just_eat', 'London', 4.3, 35, 15.00, 2.49, false),
  ('Paws & Plates', 'Pet Food', 'deliveroo', 'London', 4.8, 40, 20.00, 4.99, true)
ON CONFLICT DO NOTHING;

-- Insert sample dishes
DO $$
DECLARE
  healthy_kitchen_id uuid;
  green_bowl_id uuid;
  paws_plates_id uuid;
BEGIN
  SELECT id INTO healthy_kitchen_id FROM restaurants WHERE name = 'The Healthy Kitchen' LIMIT 1;
  SELECT id INTO green_bowl_id FROM restaurants WHERE name = 'Green Bowl' LIMIT 1;
  SELECT id INTO paws_plates_id FROM restaurants WHERE name = 'Paws & Plates' LIMIT 1;

  IF healthy_kitchen_id IS NOT NULL THEN
    INSERT INTO dishes (restaurant_id, name, description, ingredients, allergens, price, category, available)
    VALUES
      (healthy_kitchen_id, 'Grilled Salmon with Quinoa', 'Heart-healthy omega-3 rich salmon with organic quinoa and steamed vegetables', 
       '["Salmon", "Quinoa", "Broccoli", "Spinach", "Olive Oil"]'::jsonb, '["fish"]'::jsonb, 14.99, 'main', true),
      (healthy_kitchen_id, 'Mediterranean Chicken Bowl', 'Lean chicken breast with mixed greens and tahini dressing',
       '["Chicken Breast", "Mixed Greens", "Cherry Tomatoes", "Cucumber", "Tahini"]'::jsonb, '["sesame"]'::jsonb, 12.99, 'main', true)
    ON CONFLICT DO NOTHING;
  END IF;

  IF green_bowl_id IS NOT NULL THEN
    INSERT INTO dishes (restaurant_id, name, description, ingredients, allergens, price, category, available)
    VALUES
      (green_bowl_id, 'Buddha Bowl', 'Nutrient-dense bowl with sweet potato, chickpeas, and avocado',
       '["Sweet Potato", "Chickpeas", "Avocado", "Kale", "Tahini"]'::jsonb, '["sesame"]'::jsonb, 11.99, 'main', true),
      (green_bowl_id, 'Green Smoothie Bowl', 'Antioxidant-rich smoothie with fresh berries',
       '["Spinach", "Banana", "Blueberries", "Almond Milk", "Chia Seeds"]'::jsonb, '["nuts"]'::jsonb, 8.99, 'breakfast', true)
    ON CONFLICT DO NOTHING;
  END IF;

  IF paws_plates_id IS NOT NULL THEN
    INSERT INTO dishes (restaurant_id, name, description, ingredients, allergens, price, category, available)
    VALUES
      (paws_plates_id, 'Renal Support Meal (Dog)', 'Veterinary-approved low-phosphorus meal for dogs with kidney disease',
       '["Chicken Breast", "Sweet Potato", "Green Beans", "Fish Oil"]'::jsonb, '[]'::jsonb, 18.99, 'medical', true),
      (paws_plates_id, 'Digestive Care Bowl (Cat)', 'Easily digestible meal for cats with sensitive stomachs',
       '["Turkey", "Pumpkin", "Rice", "Probiotics"]'::jsonb, '[]'::jsonb, 16.99, 'medical', true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- Insert sample grocery products
DO $$
DECLARE
  ocado_id uuid;
  tesco_id uuid;
BEGIN
  SELECT id INTO ocado_id FROM grocery_stores WHERE name = 'Ocado' LIMIT 1;
  SELECT id INTO tesco_id FROM grocery_stores WHERE name = 'Tesco' LIMIT 1;

  IF ocado_id IS NOT NULL THEN
    INSERT INTO grocery_products (store_id, sku, name, brand, category, price, unit, in_stock)
    VALUES
      (ocado_id, 'OCADO-001', 'Organic Salmon Fillets', 'Ocado', 'Fish & Seafood', 8.99, '2 fillets', true),
      (ocado_id, 'OCADO-002', 'Organic Quinoa', 'Ocado', 'Grains & Pasta', 3.49, '500g', true),
      (ocado_id, 'OCADO-003', 'Free Range Chicken Breast', 'Ocado', 'Meat & Poultry', 6.99, '400g', true)
    ON CONFLICT DO NOTHING;
  END IF;

  IF tesco_id IS NOT NULL THEN
    INSERT INTO grocery_products (store_id, sku, name, brand, category, price, unit, in_stock)
    VALUES
      (tesco_id, 'TESCO-001', 'Fresh Salmon Fillets', 'Tesco Finest', 'Fish & Seafood', 7.49, '2 fillets', true),
      (tesco_id, 'TESCO-002', 'Quinoa', 'Tesco', 'Grains & Pasta', 2.99, '500g', true),
      (tesco_id, 'TESCO-003', 'Chicken Breast Fillets', 'Tesco', 'Meat & Poultry', 5.99, '400g', true)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;