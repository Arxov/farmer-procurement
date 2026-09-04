import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Payment, PaymentStatus } from '../types/database';

export interface PaginatedPayments {
  data: Payment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const paymentsQueryKeys = {
  all: ['payments'] as const,
  list: (page: number, limit: number) => ['payments', 'list', page, limit] as const,
};

export async function fetchPayments(page: number, limit: number, token?: string): Promise<PaginatedPayments> {
  if (!token) throw new Error('Authentication required');
  const res = await fetch(`/api/admin/payments?page=${page}&limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || res.statusText);
  }
  return res.json();
}

export function useAdminPayments(page: number, limit: number, token?: string) {
  return useQuery({
    queryKey: paymentsQueryKeys.list(page, limit),
    queryFn: () => fetchPayments(page, limit, token),
    enabled: Boolean(token),
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60,
  });
}

export function useUpdatePaymentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, token }: { id: string; status: PaymentStatus; token: string }) => {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || res.statusText);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: paymentsQueryKeys.all });
    },
  });
}
