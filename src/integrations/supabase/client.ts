import { createClient } from '@supabase/supabase-js'

// Use environment variables for Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || `https://xlspvitytfzjqsubjnlv.supabase.co`
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhsc3B2aXR5dGZ6anFzdWJqbmx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMxOTk2ODgsImV4cCI6MjA2ODc3NTY4OH0.2sLkzpf3_aQTFyPlfjg_GPExvx3-VXezyHtyyuxKri0`

export const supabase = createClient(supabaseUrl, supabaseAnonKey)