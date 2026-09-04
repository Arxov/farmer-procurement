// Client-side Supabase client - safe to use in the browser (uses the public anon key)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Copy .env.local.example to .env.local and fill in your project credentials.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
