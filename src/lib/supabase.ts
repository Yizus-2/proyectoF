import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials are missing. Check your .env file.')
}

// Default to a placeholder if variables are missing to avoid crashing the app
const placeholderUrl = 'https://placeholder-project.supabase.co'
const placeholderKey = 'placeholder-key'

export const supabase = createClient(
  supabaseUrl || placeholderUrl, 
  supabaseAnonKey || placeholderKey
)
