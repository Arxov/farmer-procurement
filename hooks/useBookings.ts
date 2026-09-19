import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSupabaseClient } from '../lib/supabaseClient';
import { BookingStatus } from '../types/database';

export const bookingsQueryKeys = {
  all: ['bookings'] as const,
  farmer: (farmerId?: string) => ['bookings', 'farmer', farmerId] as const,
  officer: (date?: string) => ['bookings', 'officer', date] as const,
};

export async function fetchFarmerBookings(supabase: any, farmerId?: string) {
  if (!farmerId) return [];
  const { data, error } = await supabase
    .from('bookings')
    .select('*, centres(name), commodities(name), queue_entries(queue_position, estimated_wait_minutes), payments(amount, status, utr_reference), gate_passes(id)')
    .eq('farmer_id', farmerId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

export function useFarmerBookings(farmerId?: string) {
  const supabase = useSupabaseClient();
  return useQuery({
    queryKey: bookingsQueryKeys.farmer(farmerId),
    queryFn: () => fetchFarmerBookings(supabase, farmerId),
    enabled: Boolean(farmerId),
    staleTime: 1000 * 30, // 30s
  });
}

export async function fetchOfficerBookings(supabase: any, date: string) {
  if (!date) return [];
  const { data, error } = await supabase
    .from('bookings')
    .select('*, profiles(full_name, phone), commodities(name)')
    .eq('slot_date', date)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export function useOfficerBookings(date: string) {
  const supabase = useSupabaseClient();
  return useQuery({
    queryKey: bookingsQueryKeys.officer(date),
    queryFn: () => fetchOfficerBookings(supabase, date),
    enabled: Boolean(date),
    staleTime: 1000 * 30, // 30s
  });
}

export interface UpdateStatusVariables {
  bookingId: string;
  status: BookingStatus;
  actionData?: Record<string, any>;
  token: string;
}

export function useUpdateBookingStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ bookingId, status, actionData = {}, token }: UpdateStatusVariables) => {
      const res = await fetch(`/api/bookings/${bookingId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, ...actionData }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || res.statusText);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookingsQueryKeys.all });
    },
  });
}
