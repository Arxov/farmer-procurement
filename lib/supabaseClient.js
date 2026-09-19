import { createClient } from '@supabase/supabase-js';
import { useSession } from '@clerk/nextjs';
import { useMemo } from 'react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy-url.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy-anon-key';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NODE_ENV !== 'production' && typeof window !== 'undefined') {
  console.warn('Missing Supabase environment variables. Using dummy values for development/build.');
}

export function useSupabaseClient() {
  const { session } = useSession();

  return useMemo(() => {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        fetch: async (url, options = {}) => {
          const clerkToken = await session?.getToken({ template: 'supabase' });
          const headers = new Headers(options?.headers);
          if (clerkToken) {
            headers.set('Authorization', `Bearer ${clerkToken}`);
          }
          return fetch(url, { ...options, headers });
        },
      },
    });
  }, [session]);
}
