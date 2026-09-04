import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { Commodity } from '../types/database';

export const commoditiesQueryKey = ['commodities'] as const;

export async function fetchCommodities(): Promise<Commodity[]> {
  const { data, error } = await supabase
    .from('commodities')
    .select('*')
    .order('msp_rate_per_quintal', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export function useCommodities() {
  return useQuery({
    queryKey: commoditiesQueryKey,
    queryFn: fetchCommodities,
    staleTime: 1000 * 60 * 10, // 10 mins cache
  });
}
