import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCentres, centresQueryKey } from '@/hooks/useCentres';
import { useCommodities, commoditiesQueryKey } from '@/hooks/useCommodities';

// Mock Supabase
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: jest.fn((table: string) => ({
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockImplementation(() => {
        if (table === 'centres') {
          return Promise.resolve({
            data: [
              { id: '1', name: 'Centre Alpha', daily_capacity: 50 },
              { id: '2', name: 'Centre Beta', daily_capacity: 100 },
            ],
            error: null,
          });
        }
        if (table === 'commodities') {
          return Promise.resolve({
            data: [
              { id: '1', name: 'Wheat', msp_rate_per_quintal: 2275 },
              { id: '2', name: 'Paddy', msp_rate_per_quintal: 2183 },
            ],
            error: null,
          });
        }
        return Promise.resolve({ data: [], error: null });
      }),
    })),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('React Query Hooks', () => {
  it('useCentres fetches and returns centres', async () => {
    const { result } = renderHook(() => useCentres(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].name).toBe('Centre Alpha');
  });

  it('useCommodities fetches and returns commodities', async () => {
    const { result } = renderHook(() => useCommodities(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data?.[0].name).toBe('Wheat');
  });
});
