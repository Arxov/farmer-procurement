// Server-side ONLY Supabase client - uses the service role key which bypasses
// Row Level Security. Never import this file into a page/component that runs
// in the browser; only use it inside pages/api/* handlers.
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
