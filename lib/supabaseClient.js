// Client-side Supabase client - safe to use in the browser (uses the public anon key)
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy-url.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-anon-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  console.warn('Missing Supabase environment variables. Using dummy values for development/build.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
