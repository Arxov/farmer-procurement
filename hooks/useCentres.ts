import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { Centre } from '../types/database';

export const centresQueryKey = ['centres'] as const;

export async function fetchCentres(): Promise<Centre[]> {
  const { data, error } = await supabase
    .from('centres')
    .select('*')
    .order('name', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export function useCentres() {
  return useQuery({
    queryKey: centresQueryKey,
    queryFn: fetchCentres,
    staleTime: 1000 * 60 * 10, // 10 mins cache
  });
}
