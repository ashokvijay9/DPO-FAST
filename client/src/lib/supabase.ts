import { createClient } from '@supabase/supabase-js'

// Temporary placeholder values while migrating to Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder'

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase not fully configured - using placeholder values for development. Backend auth still works.')
}

// Client for browser/frontend use
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types (will be auto-generated later)
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          auth_user_id: string | null
          email: string | null
          first_name: string | null
          last_name: string | null
          profile_image_url: string | null
          company: string | null
          role: string | null
          subscription_status: string | null
          subscription_plan: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          auth_user_id?: string | null
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          profile_image_url?: string | null
          company?: string | null
          role?: string | null
          subscription_status?: string | null
          subscription_plan?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          auth_user_id?: string | null
          email?: string | null
          first_name?: string | null
          last_name?: string | null
          profile_image_url?: string | null
          company?: string | null
          role?: string | null
          subscription_status?: string | null
          subscription_plan?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
  }
}