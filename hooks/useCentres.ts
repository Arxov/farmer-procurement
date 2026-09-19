import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient } from '../lib/supabaseClient';
import { Centre } from '../types/database';

export const centresQueryKey = ['centres'] as const;

export async function fetchCentres(supabase: any): Promise<Centre[]> {
  const { data, error } = await supabase
    .from('centres')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export function useCentres() {
  const supabase = useSupabaseClient();
  return useQuery({
    queryKey: centresQueryKey,
    queryFn: () => fetchCentres(supabase),
    staleTime: 1000 * 60 * 10, // 10 mins cache
  });
}
