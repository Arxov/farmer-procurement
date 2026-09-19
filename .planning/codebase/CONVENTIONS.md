---
last_mapped_commit: 5f86afb2c4dee2caa1603def88e41ce4e33c7190
last_mapped_at: 2026-09-19
---
# Coding Conventions

**Analysis Date:** 2026-09-19

## Naming Patterns

**Files:**

- React Components: Use PascalCase with `.tsx` for TypeScript components or `.js` for legacy components (e.g., `components/CropBadge.tsx`, `components/ErrorBoundary.tsx`, `components/AdminCharts.js`). New components MUST use `.tsx`.
- Custom Hooks: Use camelCase prefixed with `use` in `.ts` files (e.g., `hooks/useBookings.ts`, `hooks/useCentres.ts`, `hooks/useCommodities.ts`).
- Utility & Core Modules: Use camelCase with `.ts` or `.js` (e.g., `lib/apiAuth.ts`, `lib/cropIcons.ts`, `lib/env.ts`, `lib/logger.ts`, `lib/offlineQueue.ts`, `lib/validations.ts`).
- Pages & Routes: Use kebab-case for static routes and bracket syntax for dynamic parameters following Next.js Pages router conventions (e.g., `pages/farmer/book-slot.js`, `pages/farmer/net-calculator.js`, `pages/farmer/token/[id].js`).
- API Endpoints: Use kebab-case resource names and bracket syntax for dynamic routes (e.g., `pages/api/bookings/create.ts`, `pages/api/centres/[id]/availability.ts`, `pages/api/admin/payments.ts`). New API endpoints MUST use `.ts`.
- Test Files: Co-locate tests under the `__tests__/` directory mirroring source paths, naming files `*.test.tsx` for components/hooks and `*.test.ts` for pure logic (e.g., `__tests__/components/CropBadge.test.tsx`, `__tests__/lib/validations.test.ts`).

**Functions:**

- React Functional Components: Use PascalCase matching the file name (e.g., `export default function CropBadge({ name, size }: CropBadgeProps)`).
- Custom Hooks: Use camelCase prefixed with `use` (e.g., `export function useFarmerBookings(farmerId?: string)`).
- Query & Fetch Functions: Use camelCase with action prefix (e.g., `fetchFarmerBookings`, `fetchCentres`).
- Utilities & Helper Functions: Use camelCase descriptive verbs (e.g., `getCropConfig`, `validateEnv`, `validateBody`, `getPagination`, `paginatedResponse`, `syncOfflineQueue`).
- API Handlers: Use `async function handler(req: AuthenticatedNextApiRequest, res: NextApiResponse)` wrapped in `withAuth` higher-order function (e.g., in `pages/api/bookings/create.ts`).

**Variables:**

- Constants & Lookups: Use UPPER_SNAKE_CASE for static dictionaries, constants, and storage keys (e.g., `CROP_CONFIGS` in `lib/cropIcons.ts`, `VALID_TRANSITIONS` in `pages/api/bookings/[id]/status.ts`, `QUEUE_KEY` in `lib/offlineQueue.ts`).
- Zod Schemas: Use PascalCase ending with `Schema` (e.g., `CreateBookingSchema`, `UpdateBookingStatusSchema`, `CreateGrievanceSchema` in `lib/validations.ts`).
- React Query Keys: Use camelCase ending with `Key` or `Keys` (e.g., `centresQueryKey` in `hooks/useCentres.ts`, `bookingsQueryKeys` in `hooks/useBookings.ts`).
- State and Local Variables: Use camelCase (e.g., `offlineQueueCount`, `parsedQuantity`, `isHealthy`).
- Booleans: Prefix with `is`, `has`, or `should` (e.g., `isLoading`, `hasError`, `isDark`, `isStaff`).

**Types:**

- Interfaces & Type Aliases: Use PascalCase (e.g., `UserRole`, `BookingStatus`, `Profile`, `Booking`, `Payment` in `types/database.ts`).
- Component Props Interfaces: Use ComponentName + `Props` (e.g., `CropBadgeProps` in `components/CropBadge.tsx`, `PageTransitionProps` in `components/PageTransition.tsx`, `EmptyStateProps` in `components/Skeleton.tsx`).
- API Contracts: Use PascalCase ending with `Request` or `Response` (e.g., `CreateBookingRequest`, `SuggestSlotResponse`, `ApiResponse` in `types/api.ts`).

## Code Style

**Formatting:**

- Indentation: 2 spaces. No tabs.
- Quotes: Use single quotes (`'...'`) for JavaScript/TypeScript imports and string literals; use double quotes (`"..."`) for JSX attributes (`className="..."`).
- Semicolons: Always terminate statements with semicolons in TypeScript code.
- CSS Styling: Use Tailwind CSS utility classes. Group utility classes logically: layout/positioning, box model (display, padding, margin, width, height), typography, colors, borders/shadows, states (`hover:`, `active:`), and theme modifiers (`dark:`). Example: `className="fixed top-3 right-3 z-50 w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-neutral-800 border border-gray-200 shadow-sm"`.

**Linting:**

- Linter: `next lint` is defined in `package.json`.
- Type Checking: TypeScript compiler enforces syntax correctness via `npm run type-check` (`tsc --noEmit`).
- Strictness: `tsconfig.json` runs with `skipLibCheck: true`, `strict: false`, `forceConsistentCasingInFileNames: true`, and `noEmit: true`. When adding new TypeScript code, provide explicit types for function parameters, return values, and exported interfaces.

## Import Organization

**Order:**

1. Core framework and third-party libraries (e.g., `react`, `next/router`, `@tanstack/react-query`, `framer-motion`, `zod`, `@supabase/supabase-js`)
2. Internal UI components and providers (e.g., `@/components/CropBadge`, `../components/Providers`)
3. Custom hooks (e.g., `@/hooks/useBookings`, `../hooks/useCentres`)
4. Internal library utilities, clients, and helpers (e.g., `@/lib/logger`, `@/lib/validations`, `../lib/supabaseAdmin`)
5. Type definitions and interfaces (e.g., `../types/database`, `../types/api`)
6. Stylesheets and static assets (e.g., `../styles/globals.css`)

**Path Aliases:**

- Use the `@/*` path alias mapped to `<rootDir>/*` in `tsconfig.json` and `jest.config.js`.
- Always use `@/components/...`, `@/lib/...`, and `@/hooks/...` in test files and new source files rather than deep relative paths (`../../..`).

## Error Handling

**Patterns:**

- API Route Protection & Boundary:
  - Always wrap protected API endpoints with `withAuth(handler, { roles: [...] })` from `lib/apiAuth.ts`. It catches unhandled exceptions, logs execution errors, and returns standard HTTP 500 `{ error: 'Internal Server Error' }`.
  - Validate HTTP method immediately: `if (req.method !== 'POST') return res.status(405).end();`.
  - Validate request payloads with Zod schemas using `validateBody(schema, req.body)` from `lib/validations.ts`. On failure, return HTTP 400 with `{ error: validation.error }`.
  - For database operations, inspect `error` returned by Supabase. For state transition conflicts or concurrency race conditions, return HTTP 409 (e.g., Supabase error code `PGRST116`).
- Client-side React Error Boundary:
  - The application root in `pages/_app.js` is wrapped with `<ErrorBoundary>`.
  - For modular UI components that fetch dynamic data, wrap sections in `<ErrorBoundary sectionName="Section Title">` from `components/ErrorBoundary.tsx` to prevent full-page crashes and provide an isolated "Try Again" fallback.
- Offline & Network Resilience:
  - In offline queue processors (`lib/offlineQueue.ts`), discard client validation errors (HTTP 4xx) to avoid poison pill retry loops, while retaining entries on server errors (HTTP 5xx) for subsequent background sync.

## Logging

**Framework:** Custom structured logger singleton from `lib/logger.ts` (`logger`).

**Patterns:**

- Always import and use `logger` from `lib/logger.ts` instead of raw `console.log` / `console.error` in new modules and API routes.
- Log Levels:
  - `logger.info(message, context)`: Informational system events and successful milestones.
  - `logger.warn(message, context)`: Non-fatal anomalies, fallback invocations, and degraded database queries (e.g., health check warnings in `pages/api/health.ts`).
  - `logger.error(message, error, context)`: Caught exceptions, unhandled component crashes, and database connection failures. Pass the error object as the second parameter to capture `name`, `message`, and `stack`.
  - `logger.debug(message, context)`: Development diagnostics and detailed execution traces.
- Production Environment:
  - In production (`NODE_ENV === 'production'`), `logger` outputs serialized single-line JSON (`LogEntry`) suitable for log aggregators (CloudWatch, Datadog).
- Web Vitals:
  - Performance telemetry is captured in `pages/_app.js` using `reportWebVitals` for LCP, CLS, FID, and INP metrics.

## Comments

**When to Comment:**

- Security Boundaries: Document client vs. server context constraints (e.g., explicit warnings in `lib/supabaseAdmin.js` stating it uses the service role key and MUST NOT be imported into client-side code).
- Concurrency & Transaction Semantics: Document race condition prevention and atomic locks (e.g., explaining Postgres RPC `book_slot_atomic` using `SELECT FOR UPDATE` in `pages/api/bookings/create.ts`).
- Finite State Machine Transitions: Document allowed status flows (e.g., `VALID_TRANSITIONS` in `pages/api/bookings/[id]/status.ts`).

**JSDoc/TSDoc:**

- Use OpenAPI `@swagger` annotations above API routes in `pages/api/**/*.ts` specifying summaries, security requirements (`BearerAuth`), requestBody schemas, and response status codes. These are parsed by `next-swagger-doc` for `pages/api-docs.tsx`.

## Function Design

**Size:**

- Keep functions concise and single-purposed.
- Extract complex subroutines into separate helper functions (e.g., `processSuccessfulBooking` separated from `handler` in `pages/api/bookings/create.ts`).

**Parameters:**

- For functions taking more than 2 parameters or optional configurations, accept a single options object with an interface (e.g., `EmptyState({ title, description, actionText, onAction }: EmptyStateProps)` in `components/Skeleton.tsx`).

**Return Values:**

- Explicitly declare return types for TypeScript utilities and hooks (e.g., `getCropConfig(commodityName?: string | null): CropConfig`, `getPagination(...): PaginationParams`).
- Return discriminated unions or standard outcome objects for validation functions (e.g., `{ success: true; data: T } | { success: false; error: string }` in `validateBody`).

## Module Design

**Exports:**

- Default Exports: Use default exports for React page components (`pages/**/*.tsx`), Next.js API handlers (`pages/api/**/*.ts`), and primary UI components (`components/CropBadge.tsx`, `components/ErrorBoundary.tsx`, `components/ThemeToggle.tsx`).
- Named Exports: Use named exports for utility functions, custom hooks, schemas, query key constants, and TypeScript interfaces (e.g., `export function useCentres()`, `export const centresQueryKey = ...`).
- Singleton Exports: Export singletons for shared instances (e.g., `export const logger = new Logger();` in `lib/logger.ts`, `export const supabase = createClient(...)` in `lib/supabaseClient.js`).

**Barrel Files:**

- Do NOT use barrel files (`index.ts` re-exporting folders). Import directly from the exact file path (e.g., `import { logger } from '@/lib/logger';` and `import CropBadge from '@/components/CropBadge';`).

---

*Convention analysis: 2026-09-19*
