export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          full_name: string
          date_of_birth: string | null
          species_type: 'human' | 'pet'
          pet_species: string | null
          pet_breed: string | null
          weight_kg: number | null
          height_cm: number | null
          biological_sex: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          date_of_birth?: string | null
          species_type?: 'human' | 'pet'
          pet_species?: string | null
          pet_breed?: string | null
          weight_kg?: number | null
          height_cm?: number | null
          biological_sex?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          date_of_birth?: string | null
          species_type?: 'human' | 'pet'
          pet_species?: string | null
          pet_breed?: string | null
          weight_kg?: number | null
          height_cm?: number | null
          biological_sex?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      biomarker_records: {
        Row: {
          id: string
          profile_id: string
          test_date: string
          source_type: 'pdf' | 'photo' | 'manual' | 'integration'
          raw_data: Json | null
          processed_data: Json | null
          risk_level: 'normal' | 'caution' | 'urgent'
          flagged_markers: Json
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          test_date: string
          source_type?: 'pdf' | 'photo' | 'manual' | 'integration'
          raw_data?: Json | null
          processed_data?: Json | null
          risk_level?: 'normal' | 'caution' | 'urgent'
          flagged_markers?: Json
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          test_date?: string
          source_type?: 'pdf' | 'photo' | 'manual' | 'integration'
          raw_data?: Json | null
          processed_data?: Json | null
          risk_level?: 'normal' | 'caution' | 'urgent'
          flagged_markers?: Json
          created_at?: string
        }
      }
      health_conditions: {
        Row: {
          id: string
          profile_id: string
          condition_name: string
          condition_type: 'diagnosed' | 'suspected' | 'risk'
          probability_score: number | null
          identified_from: 'biomarkers' | 'symptoms' | 'user_reported'
          active: boolean
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          condition_name: string
          condition_type?: 'diagnosed' | 'suspected' | 'risk'
          probability_score?: number | null
          identified_from: 'biomarkers' | 'symptoms' | 'user_reported'
          active?: boolean
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          condition_name?: string
          condition_type?: 'diagnosed' | 'suspected' | 'risk'
          probability_score?: number | null
          identified_from?: 'biomarkers' | 'symptoms' | 'user_reported'
          active?: boolean
          notes?: string | null
          created_at?: string
        }
      }
      nutrition_recommendations: {
        Row: {
          id: string
          profile_id: string
          recommendation_type: 'eat' | 'avoid' | 'caution'
          food_item: string
          category: string
          rationale: string | null
          priority_level: number
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          recommendation_type: 'eat' | 'avoid' | 'caution'
          food_item: string
          category: string
          rationale?: string | null
          priority_level?: number
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          recommendation_type?: 'eat' | 'avoid' | 'caution'
          food_item?: string
          category?: string
          rationale?: string | null
          priority_level?: number
          active?: boolean
          created_at?: string
        }
      }
      supplement_protocols: {
        Row: {
          id: string
          profile_id: string
          supplement_name: string
          dosage: string
          frequency: string
          rationale: string | null
          safety_notes: string | null
          interactions: Json
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          supplement_name: string
          dosage: string
          frequency: string
          rationale?: string | null
          safety_notes?: string | null
          interactions?: Json
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          supplement_name?: string
          dosage?: string
          frequency?: string
          rationale?: string | null
          safety_notes?: string | null
          interactions?: Json
          active?: boolean
          created_at?: string
        }
      }
      meal_plans: {
        Row: {
          id: string
          profile_id: string
          plan_name: string
          start_date: string
          end_date: string
          meals: Json
          nutritional_targets: Json
          adherence_score: number | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          plan_name: string
          start_date: string
          end_date: string
          meals?: Json
          nutritional_targets?: Json
          adherence_score?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          plan_name?: string
          start_date?: string
          end_date?: string
          meals?: Json
          nutritional_targets?: Json
          adherence_score?: number | null
          created_at?: string
        }
      }
      lifestyle_tracking: {
        Row: {
          id: string
          profile_id: string
          log_date: string
          log_type: 'meal' | 'symptom' | 'exercise' | 'sleep' | 'medication' | 'bowel' | 'urine'
          data: Json
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          log_date: string
          log_type: 'meal' | 'symptom' | 'exercise' | 'sleep' | 'medication' | 'bowel' | 'urine'
          data: Json
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          log_date?: string
          log_type?: 'meal' | 'symptom' | 'exercise' | 'sleep' | 'medication' | 'bowel' | 'urine'
          data?: Json
          notes?: string | null
          created_at?: string
        }
      }
      appointments: {
        Row: {
          id: string
          profile_id: string
          appointment_type: 'gp' | 'specialist' | 'vet' | 'lab' | 'other'
          provider_name: string
          appointment_date: string
          status: 'scheduled' | 'completed' | 'cancelled'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          appointment_type: 'gp' | 'specialist' | 'vet' | 'lab' | 'other'
          provider_name: string
          appointment_date: string
          status?: 'scheduled' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          appointment_type?: 'gp' | 'specialist' | 'vet' | 'lab' | 'other'
          provider_name?: string
          appointment_date?: string
          status?: 'scheduled' | 'completed' | 'cancelled'
          notes?: string | null
          created_at?: string
        }
      }
    }
  }
}
