import { useQuery } from '@tanstack/react-query';
import { useSupabaseClient } from '../lib/supabaseClient';
import { Commodity } from '../types/database';

export const commoditiesQueryKey = ['commodities'] as const;

export async function fetchCommodities(supabase: any): Promise<Commodity[]> {
  const { data, error } = await supabase
    .from('commodities')
    .select('*')
    .order('msp_rate_per_quintal', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export function useCommodities() {
  const supabase = useSupabaseClient();
  return useQuery({
    queryKey: commoditiesQueryKey,
    queryFn: () => fetchCommodities(supabase),
    staleTime: 1000 * 60 * 10, // 10 mins cache
  });
}
