// Server-side ONLY Supabase client - uses the service role key which bypasses
// Row Level Security. Never import this file into a page/component that runs
// in the browser; only use it inside pages/api/* handlers.
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Missing required Supabase server environment variables (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)');
  } else {
    console.warn('[supabaseAdmin] Missing env vars. API routes will fail until .env.local is configured.');
  }
}

export const supabaseAdmin = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-key',
  { auth: { autoRefreshToken: false, persistSession: false } }
);
