---
last_mapped_commit: 5f86afb2c4dee2caa1603def88e41ce4e33c7190
last_mapped_at: 2026-09-19
---
# Testing Patterns

**Analysis Date:** 2026-09-19

## Test Framework

**Runner:**

- Jest `30.5.1` configured with `next/jest` preset and `jest-environment-jsdom` (`30.5.1`)
- Config: `jest.config.js`
- Setup file: `jest.setup.js` (initializes `@testing-library/jest-dom` and mocks browser `speechSynthesis` APIs)

**Assertion Library:**

- Built-in Jest `expect` extended with DOM matchers from `@testing-library/jest-dom` (`7.0.1`)
- DOM & Component Utilities: `@testing-library/react` (`16.3.3`) and `@testing-library/user-event` (`14.6.7`)

**Run Commands:**

```bash
npm test              # Run all unit and integration tests once (jest --watchAll=false)
npm run test:coverage # Run test suite and print code coverage report (jest --coverage)
npx jest --watch      # Run tests in interactive watch mode for active development
```

## Test File Organization

**Location:**

- Separate test tree in root `__tests__/` directory. Test directories mirror the source folder structure (`components/`, `hooks/`, `lib/`).

**Naming:**

- React components and JSX-containing hook tests: `*.test.tsx` (e.g., `__tests__/components/CropBadge.test.tsx`, `__tests__/hooks/queries.test.tsx`)
- Pure TypeScript / JavaScript logic and utilities: `*.test.ts` (e.g., `__tests__/lib/cropIcons.test.ts`, `__tests__/lib/validations.test.ts`)

**Structure:**

```
__tests__/
├── components/
│   ├── CropBadge.test.tsx       # Crop visual indicator & badge styling tests
│   ├── EmptyState.test.tsx      # EmptyState placeholder & action button tests
│   ├── ErrorBoundary.test.tsx   # React crash boundary & reset handling tests
│   ├── PageTransition.test.tsx  # Framer motion transition container tests
│   └── ThemeToggle.test.tsx     # Light/dark mode button & next-themes tests
├── hooks/
│   └── queries.test.tsx         # React Query hook tests for centres and commodities
└── lib/
    ├── cropIcons.test.ts        # Commodity name keyword matching tests
    ├── env.test.ts              # Zod environment variable parsing & assertion tests
    ├── logger.test.ts           # Structured log format & error capture tests
    ├── offlineQueue.test.ts     # IndexedDB offline booking queue & sync tests
    ├── pagination.test.ts       # Pagination offset calculation & response envelope tests
    └── validations.test.ts      # Zod booking, grievance, and payment schema tests
```

## Test Structure

**Suite Organization:**

```typescript
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CropBadge from '@/components/CropBadge';

describe('CropBadge Component', () => {
  it('renders null when name is not provided', () => {
    const { container } = render(<CropBadge name={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders crop icon and name for Wheat', () => {
    render(<CropBadge name="Wheat" size="sm" />);
    expect(screen.getByText('🌾')).toBeInTheDocument();
    expect(screen.getByText('Wheat')).toBeInTheDocument();
  });

  it('renders correctly with different sizes', () => {
    const { rerender } = render(<CropBadge name="Paddy" size="xs" />);
    expect(screen.getByText('Paddy')).toBeInTheDocument();

    rerender(<CropBadge name="Paddy" size="md" />);
    expect(screen.getByText('Paddy')).toBeInTheDocument();
  });
});
```

**Patterns:**

- Suite Declaration: Group related tests inside `describe('ModuleName', () => { ... })` and use descriptive behavior sentences starting with `it('does expected action when condition', () => { ... })`.
- Setup & Teardown:
  - Use `beforeEach` to reset in-memory mocks, clear `localStorage`, and reset Jest mocks (`jest.clearAllMocks()`).
  - Use `beforeAll` / `afterAll` when suppressing expected console output (such as intentional `console.error` during error boundary crash tests).
- AAA Pattern: Follow Arrange -> Act -> Assert strictly in every test block.

## Mocking

**Framework:** Built-in Jest mock functions (`jest.mock`, `jest.fn`, `jest.spyOn`).

**Patterns:**

*1. Mocking Supabase Client (`__tests__/hooks/queries.test.tsx`):*

```typescript
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
        return Promise.resolve({ data: [], error: null });
      }),
    })),
  },
}));
```

*2. Mocking Third-Party Context Providers (`__tests__/components/ThemeToggle.test.tsx`):*

```typescript
const mockSetTheme = jest.fn();
jest.mock('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: 'light',
    setTheme: mockSetTheme,
  }),
}));
```

*3. Mocking Storage Engines (`idb-keyval` in `__tests__/lib/offlineQueue.test.ts`):*

```typescript
let mockDbStore: Record<string, any> = {};

jest.mock('idb-keyval', () => ({
  get: jest.fn((key: string) => Promise.resolve(mockDbStore[key])),
  set: jest.fn((key: string, val: any) => {
    mockDbStore[key] = val;
    return Promise.resolve();
  }),
  del: jest.fn((key: string) => {
    delete mockDbStore[key];
    return Promise.resolve();
  }),
}));
```

*4. Mocking Global Fetch (`__tests__/lib/offlineQueue.test.ts`):*

```typescript
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: async () => ({ success: true }),
});
```

**What to Mock:**

- Supabase client network calls (`@/lib/supabaseClient`)
- Global `fetch` requests to internal or external API endpoints
- IndexedDB (`idb-keyval`) and browser storage APIs
- Browser APIs unsupported in JSDOM (`speechSynthesis`, `serviceWorker`, `SyncManager`)
- Theme providers and complex global context providers

**What NOT to Mock:**

- Zod validation schemas (`lib/validations.ts`)
- Pure business logic calculations (`lib/pagination.ts`, `lib/cropIcons.ts`)
- Component rendering internals and React DOM hierarchy
- Logger formatting and error extraction logic (`lib/logger.ts`)

## Fixtures and Factories

**Test Data:**

- Define typed fixture objects inline to maintain clarity and independence between tests.

```typescript
// Zod Booking Payload Fixture
const validBookingPayload = {
  centreId: '123e4567-e89b-12d3-a456-426614174000',
  commodityId: '123e4567-e89b-12d3-a456-426614174001',
  date: '2026-10-15',
  slotWindow: '10:00-12:00',
  quantity: 50,
};

// React Query Wrapper Factory
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false, // Prevent infinite retry loops during tests
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
```

**Location:**

- Test data fixtures are defined directly inside corresponding test files (`__tests__/lib/validations.test.ts`, `__tests__/lib/offlineQueue.test.ts`, `__tests__/hooks/queries.test.tsx`).

## Coverage

**Requirements:**

- Automated in Continuous Integration via `.github/workflows/ci.yml` using `npm test -- --coverage`.
- Test suite currently executes 12 suites and 35 tests with 100% passing rate.
- Coverage baseline for tested modules:
  - Statements: 78.12%
  - Branches: 58.40%
  - Functions: 81.81%
  - Lines: 80.81%
  - `CropBadge.tsx`, `PageTransition.tsx`, `ThemeToggle.tsx`, `cropIcons.ts`, `env.ts`, `pagination.ts`, `validations.ts` achieve 100% line coverage.

**View Coverage:**

```bash
npm run test:coverage
```

## Test Types

**Unit Tests:**

- Validate discrete functions in isolation:
  - Zod schemas validating correct and incorrect payloads (`__tests__/lib/validations.test.ts`).
  - Pagination offset and limits with bounds checks (`__tests__/lib/pagination.test.ts`).
  - Crop config keyword mapping and fallbacks (`__tests__/lib/cropIcons.test.ts`).
  - Structured log formatting in `lib/logger.ts`.
  - Component rendering with different prop permutations (`CropBadge`, `EmptyState`, `ThemeToggle`).

**Integration Tests:**

- Validate component and hook interactions with external contracts:
  - Custom React Query hooks fetching data through mocked Supabase client using `renderHook` and `waitFor` (`__tests__/hooks/queries.test.tsx`).
  - React `ErrorBoundary` lifecycle catching child component exceptions and executing reset callbacks (`__tests__/components/ErrorBoundary.test.tsx`).
  - Offline sync engine reading from mocked IndexedDB and synchronizing via mocked `fetch` with selective status code error handling (`__tests__/lib/offlineQueue.test.ts`).

**E2E Tests:**

- Not currently implemented. Testing focuses on fast, deterministic unit and integration tests executing under Jest and JSDOM.

## Common Patterns

**Async Testing:**

- Testing asynchronous React Query hooks with `renderHook` and `waitFor`:

```typescript
import { renderHook, waitFor } from '@testing-library/react';

it('useCentres fetches and returns centres', async () => {
  const { result } = renderHook(() => useCentres(), { wrapper: createWrapper() });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(result.current.data).toHaveLength(2);
  expect(result.current.data?.[0].name).toBe('Centre Alpha');
});
```

**Error Testing:**

- Testing throwing functions and schema rejections:

```typescript
// Testing exception throw
it('throws an error on invalid supabase URL format', () => {
  const invalidConfig = {
    NEXT_PUBLIC_SUPABASE_URL: 'not-a-url',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
  };

  expect(() => validateEnv(invalidConfig as any)).toThrow();
});

// Testing schema validation rejection message
it('fails CreateBooking payload with invalid date format', () => {
  const payload = {
    centreId: '123e4567-e89b-12d3-a456-426614174000',
    commodityId: '123e4567-e89b-12d3-a456-426614174001',
    date: '10-15-2026',
    slotWindow: '10:00-12:00',
  };
  const result = validateBody(CreateBookingSchema, payload);
  expect(result.success).toBe(false);
  if (!result.success) {
    expect(result.error).toContain('Date must be YYYY-MM-DD');
  }
});
```

---

*Testing analysis: 2026-09-19*
