---
last_mapped_commit: 5f86afb2c4dee2caa1603def88e41ce4e33c7190
last_mapped_at: 2026-09-19
---
<!-- refreshed: 2026-09-19 -->

# Architecture

**Analysis Date:** 2026-09-19

## System Overview

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 Client Tier (Browser / PWA)                            │
├──────────────────────────┬─────────────────────────────┬───────────────────────────────┤
│   Farmer Portal (Mobile) │   Officer Operations Portal │   Admin Analytics & Control   │
│   `pages/farmer/*`       │   `pages/officer/*`         │   `pages/admin/*`             │
│   `components/Farmer*`   │   `pages/officer/dashboard` │   `components/AdminCharts.js` │
└─────────────┬────────────┴──────────────┬──────────────┴───────────────┬───────────────┘
              │                           │                              │
              │  Cached Reads (Anon Key)  │  Mutations / Admin Ops (JWT) │
              ▼                           ▼                              ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              Application Tier (Next.js 14)                             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  State & Hooks: `hooks/useBookings.ts`, `hooks/useCentres.ts`, `hooks/useCommodities.ts` │
│  Auth Middleware: `lib/apiAuth.ts` (`withAuth` RBAC role-enforcer)                      │
│  Validation: `lib/validations.ts` (Zod schemas)                                        │
│  API Routes: `pages/api/bookings/*`, `pages/api/centres/*`, `pages/api/admin/*`        │
│  Offline Cache: `lib/offlineQueue.ts` (IndexedDB via `idb-keyval` + Background Sync)   │
│  Observability: `lib/logger.ts`, `pages/api/health.ts`, `pages/api-docs.tsx`           │
└──────────────────────────┬─────────────────────────────┬───────────────────────────────┘
                           │                             │
                           │ Direct Query (Browser)      │ Service Role RPC / Write
                           ▼                             ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                         Persistence Tier (Supabase PostgreSQL)                         │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  Tables: `profiles`, `centres`, `commodities`, `bookings`, `queue_entries`,            │
│          `gate_passes`, `payments`, `grievances` (`supabase/schema.sql`)               │
│  Security: Row Level Security (RLS) policies (`supabase/migrations/20260919_*.sql`)   │
│  Atomic RPCs: `book_slot_atomic`, `recalculate_queue_for_date`, `calculate_distance`   │
│  Realtime Engine: PostgreSQL WAL changes broadcast over WebSockets                    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| `App Shell` | Root provider layout, theme switching, global offline banner, i18n, and route transitions | `pages/_app.js` |
| `Providers` | TanStack Query client configuration with tuned stale/cache times and React Query Devtools | `components/Providers.tsx` |
| `Auth Handler` | Mobile/Aadhaar OTP authentication simulation, profile resolution, and role redirection | `pages/index.js` |
| `API Auth Guard` | Higher-order wrapper verifying Supabase JWTs, extracting user profiles, and enforcing RBAC | `lib/apiAuth.ts` |
| `Farmer Dashboard` | Displays active bookings, live queue positions, weather advisories, feedback, and offline sync | `pages/farmer/dashboard.js` |
| `Booking Wizard` | Multi-step slot booking UI with smart mandi recommendation based on distance and local bonuses | `pages/farmer/book-slot.js` |
| `Atomic Booking API` | Enforces slot capacity and daily limits via PostgreSQL `book_slot_atomic` RPC | `pages/api/bookings/create.ts` |
| `Status Machine API` | Governs chronological booking status transitions, payments creation, gate pass generation | `pages/api/bookings/[id]/status.ts` |
| `Officer Dashboard` | Mandi gate operations for check-in, weighing, QC grading, acceptance, and rejection | `pages/officer/dashboard.js` |
| `Admin Dashboard` | High-level metrics, capacity tracking, state-wise breakdowns, and SVG analytics charts | `pages/admin/dashboard.js` |
| `Admin Payments API` | Paginated payment queries and DBT disbursement status updates (`initiated` → `paid`) | `pages/api/admin/payments.ts` |
| `Smart Suggest API` | Evaluates Haversine distance, transport rates, and mandi bonus payouts for best slot choice | `pages/api/bookings/suggest.js` |
| `Gate Pass Viewer` | Printable gate pass document with metadata and embedded QR verification code | `pages/farmer/gate-pass/[id].js` |
| `Queue Token Viewer` | Live token with Devanagari numerals and Text-to-Speech vernacular voice readout | `pages/farmer/token/[id].js` |
| `Offline Sync Queue` | IndexedDB persistence for slot bookings during network loss with automated re-sync | `lib/offlineQueue.ts` |
| `Notification Dispatch` | Server-to-server notification logging and external SMS/WhatsApp webhook dispatch point | `lib/notify.js` |
| `Health Endpoint` | Health check probing uptime, database latency, and system connectivity | `pages/api/health.ts` |
| `OpenAPI Docs` | Swagger UI OpenAPI specification generated dynamically from JSDoc annotations | `pages/api-docs.tsx` |

## Pattern Overview

**Overall:** Client-Server Hybrid Architecture (Next.js Pages Router with Serverless API Layer and Supabase Backend-as-a-Service).

**Key Characteristics:**

- **Hybrid Data Retrieval:** Read-only data is fetched directly from Supabase via client-side TanStack React Query (`hooks/useCentres.ts`, `hooks/useCommodities.ts`), leveraging Supabase RLS and client caching. Privileged writes and complex transactions route through Next.js API endpoints (`pages/api/*`) using the Supabase Service Role client (`lib/supabaseAdmin.js`).
- **Database-Enforced Concurrency Control:** Capacity reservations, duplicate checks, and queue position assignments are executed within PostgreSQL transactions via `book_slot_atomic` RPC with `SELECT ... FOR UPDATE` row locking to prevent race conditions.
- **Strict State Machine Lifecycle:** Booking records move through a deterministic, unidirectional sequence (`booked` → `checked_in` → `weighed` → `quality_checked` → `accepted` → `paid`), enforced on the server in `pages/api/bookings/[id]/status.ts`.
- **Offline-First PWA Capabilities:** Client utilizes `idb-keyval` for queue storage in `lib/offlineQueue.ts`, combined with `next-pwa` service workers to allow farmers in low-connectivity rural zones to queue bookings offline.
- **Role-Based Access Control (RBAC):** Access to pages and API endpoints is strictly partitioned across three roles (`farmer`, `officer`, `admin`) via client-side route guards and the `withAuth` server wrapper in `lib/apiAuth.ts`.

## Layers

**Presentation Layer (Pages & Components):**

- Purpose: Renders role-specific portals (Farmer, Mandi Officer, Admin) and handles local interaction state.
- Location: `pages/`, `components/`
- Contains: React components, Next.js page routes, custom SVG charts (`components/AdminCharts.js`), UI wrappers (`components/Providers.tsx`, `components/ErrorBoundary.tsx`).
- Depends on: `hooks/`, `lib/i18n.js`, `lib/supabaseClient.js`, `lib/cropIcons.ts`.
- Used by: End users (Farmers, Mandi Officers, APMC Administrators).

**State Management & Data Hook Layer:**

- Purpose: Orchestrates client-side caching, polling, deduplication, and cache invalidation.
- Location: `hooks/`
- Contains: TanStack Query custom hooks (`useFarmerBookings`, `useOfficerBookings`, `useCentres`, `useCommodities`, `useAdminPayments`, `useUpdateBookingStatus`).
- Depends on: `lib/supabaseClient.js`, Next.js REST API endpoints.
- Used by: `pages/farmer/*`, `pages/officer/*`, `pages/admin/*`.

**Application & Security Layer (API Routes & Middleware):**

- Purpose: Enforces JWT authentication, RBAC permission checks, Zod payload validation, and business workflow transitions.
- Location: `pages/api/`, `lib/apiAuth.ts`, `lib/validations.ts`
- Contains: Serverless route handlers, higher-order auth wrappers, validation schemas.
- Depends on: `lib/supabaseAdmin.js`, `lib/logger.ts`, `lib/notify.js`.
- Used by: Presentation layer and external webhooks.

**Offline & Auxiliary Services Layer:**

- Purpose: Handles device capabilities, speech synthesis, audio cues, offline queues, and telemetry.
- Location: `lib/offlineQueue.ts`, `lib/audioAlert.ts`, `lib/i18n.js`, `lib/logger.ts`, `lib/swagger.ts`
- Contains: IndexedDB wrappers, Web Audio API tone synthesizers, Web Speech API integration, internationalization maps.
- Depends on: Browser APIs (`AudioContext`, `speechSynthesis`, `navigator.serviceWorker`, `idb-keyval`).
- Used by: Farmer UI components and API handlers.

**Persistence & Database Security Layer:**

- Purpose: Stores relational data, enforces Row Level Security (RLS) constraints, manages concurrency locks, and dispatches realtime change events.
- Location: `supabase/schema.sql`, `supabase/migrations/`
- Contains: Table definitions, constraints, indexes, RLS policies, PL/pgSQL stored procedures.
- Depends on: Supabase PostgreSQL instance.
- Used by: `lib/supabaseClient.js` (client-side) and `lib/supabaseAdmin.js` (server-side).

## Data Flow

### Primary Request Path: Slot Booking Flow

1. Farmer inputs procurement details (centre, crop, date, time window, quantity) in `pages/farmer/book-slot.js:205`.
2. If offline, the request is intercepted and saved to IndexedDB via `addToOfflineQueue` (`lib/offlineQueue.ts:37`).
3. If online, the payload is sent via `POST /api/bookings/create` (`pages/api/bookings/create.ts:47`) with the Bearer JWT.
4. `withAuth` middleware verifies token validity and checks user role against `profiles` table (`lib/apiAuth.ts:25-38`).
5. Payload is validated against `CreateBookingSchema` using `validateBody` (`lib/validations.ts:34`).
6. Handler calls PostgreSQL RPC `book_slot_atomic` (`supabase/migrations/00000000000000_init.sql:135`) via `supabaseAdmin`.
7. Database locks the centre row (`SELECT ... FOR UPDATE`), verifies daily capacity and duplicate booking constraints, inserts the booking, and creates a `queue_entries` record.
8. Background notification dispatch is triggered asynchronously via `sendNotification` (`lib/notify.js:2`).
9. API returns `200 OK` with booking record and queue position to the frontend (`pages/api/bookings/create.ts:101`).
10. TanStack Query cache is invalidated, haptic/confetti feedback triggers, and farmer is navigated to `pages/farmer/dashboard.js`.

### Secondary Flow: Officer Verification & Automated Settlement

1. Mandi officer views arrival list on `pages/officer/dashboard.js:28` powered by `useOfficerBookings` (`hooks/useBookings.ts:44`).
2. Officer inspects commodity, records gross weight, moisture %, admixture %, and quality grade, selecting `accepted` or `rejected`.
3. Action executes `useUpdateBookingStatus` mutation, sending `PATCH /api/bookings/[id]/status` (`pages/api/bookings/[id]/status.ts:18`).
4. Handler verifies officer role and checks state progression validity against `VALID_TRANSITIONS` (`pages/api/bookings/[id]/status.ts:7-16`).
5. Status update is executed with optimistic concurrency control (`eq('status', currentBooking.status)`).
6. If status is `accepted`:
   - System calculates total payout (`accepted_quantity * msp_rate_per_quintal`) and creates a record in `payments` with `status: 'initiated'` (`pages/api/bookings/[id]/status.ts:106`).
   - System creates a `gate_passes` record containing a JSON payload for the QR code (`pages/api/bookings/[id]/status.ts:124`).
7. Stored procedure `recalculate_queue_for_date` is called via RPC to update waiting queue positions for all remaining farmers (`pages/api/bookings/[id]/status.ts:142`).
8. Realtime Postgres change notification triggers client-side query invalidation on the farmer's open dashboard via WebSocket (`pages/farmer/dashboard.js:106`).

### Tertiary Flow: Offline Sync Recovery

1. Device regains internet connectivity, firing the browser `online` event in `pages/farmer/dashboard.js:125`.
2. Farmer dashboard executes `trySyncOffline()` calling `syncOfflineQueue` (`lib/offlineQueue.ts:73`).
3. Queued items are pulled from IndexedDB and dispatched sequentially to `/api/bookings/create`.
4. 4xx validation failures are discarded while 5xx failures are retained for retry.
5. Successfully synced bookings are cleared from storage and query cache is refetched with latest server state.

**State Management:**

- Server State: Managed via `@tanstack/react-query` (`components/Providers.tsx`) with a 5-minute `staleTime` and 30-minute `gcTime`.
- Authentication State: Managed via Supabase Auth session listener (`supabase.auth.getSession()` / `getUser()`).
- Real-Time Subscription: Active channels listen to `postgres_changes` on `public:bookings` and `public:queue_entries` (`pages/farmer/dashboard.js:104-113`).
- Offline State: Persisted locally via `idb-keyval` under key `offline_booking_queue` (`lib/offlineQueue.ts:3`).
- Application UI Preferences: Dark/light mode persisted via `next-themes` (`pages/_app.js:31`); language choice (`en`, `hi`, `mr`) stored in `localStorage` under `app_language` (`lib/i18n.js:10`).

## Key Abstractions

**API Authentication Middleware (`withAuth`):**

- Purpose: Provides declarative role-based access control and session token verification for Next.js API endpoints.
- Examples: `lib/apiAuth.ts`, used in `pages/api/bookings/create.ts:191`, `pages/api/admin/payments.ts:53`.
- Pattern: Higher-Order Function (Decorator / Middleware Wrapper).

**Zod Schema Validation (`validateBody`):**

- Purpose: Ensures type safety, boundary validation, and sanitization of HTTP request bodies before processing.
- Examples: `lib/validations.ts`, `pages/api/bookings/create.ts:50`, `pages/api/bookings/[id]/status.ts:24`.
- Pattern: Schema Validation & Contract Enforcement.

**Query Key Factories & Data Hooks:**

- Purpose: Centralizes cache keys and isolates TanStack React Query logic from presentation components.
- Examples: `hooks/useBookings.ts`, `hooks/useCentres.ts`, `hooks/useCommodities.ts`, `hooks/usePayments.ts`.
- Pattern: Repository / Custom Hook Abstraction.

**Dual Supabase Client Architecture:**

- Purpose: Distinguishes between browser-safe public access using anonymous key (`lib/supabaseClient.js`) and server-side privileged access using service role key (`lib/supabaseAdmin.js`).
- Examples: `lib/supabaseClient.js`, `lib/supabaseAdmin.js`.
- Pattern: Split Privilege / Client-Server Adapter Pattern.

**Queue Management Engine:**

- Purpose: Coordinates dynamic queue calculation, FIFO slot estimation, and wait times across centers.
- Examples: `supabase/migrations/00000000000000_init.sql`, `supabase_recalculate_queue.sql`.
- Pattern: Database Stored Procedure & Event-Driven Recalculation.

## Entry Points

**Root Entry / Authentication Gateway:**

- Location: `pages/index.js`
- Triggers: User loads base URL `/`.
- Responsibilities: Checks existing Supabase session; if unauthenticated, provides OTP login interface and routes authenticated users to their role-specific dashboard.

**Application Shell:**

- Location: `pages/_app.js`
- Triggers: Next.js runtime initialization for every route.
- Responsibilities: Mounts React Query providers, Theme provider, Language context, Toast system, global Head tags, and Framer Motion layout transitions.

**API Health Endpoint:**

- Location: `pages/api/health.ts`
- Triggers: Docker healthchecks, uptime monitors, load balancer probes (`GET /api/health`).
- Responsibilities: Verifies database connectivity, measures query latency, reports process uptime and environment status.

**OpenAPI Documentation Portal:**

- Location: `pages/api-docs.tsx`
- Triggers: Developer or auditor navigating to `/api-docs`.
- Responsibilities: Compiles Swagger OpenAPI 3.0 specification from JSDoc tags using `lib/swagger.ts` and renders interactive documentation.

## Architectural Constraints

- **Single Service Role Boundary:** `lib/supabaseAdmin.js` must NEVER be imported into files in `components/`, `hooks/`, or `pages/` (except `pages/api/*`). It carries `SUPABASE_SERVICE_ROLE_KEY` and bypasses Row Level Security.
- **Transactional Atomic Mutations:** All slot bookings must be performed through the `book_slot_atomic` PostgreSQL function to ensure seat availability is locked during evaluation.
- **Serverless Lifecycles:** Next.js API routes run in stateless serverless environments. In-memory state does not persist across requests; state must reside in PostgreSQL or IndexedDB.
- **Internal HTTP Avoidance:** Server-side notification calls must use the direct utility `sendNotification` in `lib/notify.js` rather than issuing loopback HTTP calls to `/api/notify/send` to avoid serverless socket starvation.
- **Global State Isolation:** Global state is intentionally minimized in favor of TanStack Query server-state caching and lightweight React Contexts (`LanguageContext` in `lib/i18n.js`, `ToastContext` in `components/Toast.js`).

## Anti-Patterns

### Bypassing Atomic Stored Procedures for Bookings

**What happens:** Direct database insertion into the `bookings` table from API routes or client code without invoking `book_slot_atomic`.
**Why it's wrong:** Causes race conditions during high demand, resulting in centre daily capacity overbooking and duplicate slots for the same farmer.
**Do this instead:** Always call `supabaseAdmin.rpc('book_slot_atomic', { ... })` as demonstrated in `pages/api/bookings/create.ts:63`.

### Importing Service Role Client on the Frontend

**What happens:** Importing `lib/supabaseAdmin.js` into client-rendered pages or components.
**Why it's wrong:** Exposes the master service role key in the client JavaScript bundle, compromising all Row Level Security.
**Do this instead:** Import `lib/supabaseClient.js` in client components and restrict privileged mutations to `pages/api/*` routes protected by `withAuth`.

### Client-Side State Machine Manipulation

**What happens:** Directly updating booking status to `accepted` or `paid` from frontend code.
**Why it's wrong:** Skips verification of required intermediate steps (e.g., weighing and QC testing) and prevents automated gate pass / payment creation.
**Do this instead:** Dispatch updates via `useUpdateBookingStatus` to `PATCH /api/bookings/[id]/status` where state progression rules are strictly validated (`pages/api/bookings/[id]/status.ts:37`).

## Error Handling

**Strategy:** Multi-tier defensive error handling separating client presentation from backend security.

**Patterns:**

- **Boundary Containment:** Top-level UI errors are captured by `ErrorBoundary` in `components/ErrorBoundary.tsx` wrapped around `Component` in `pages/_app.js:53`.
- **Zod Validation Errors:** API routes validate request bodies through `validateBody`, returning structured 400 responses with exact field paths (`lib/validations.ts:37`).
- **Structured Logging:** Server errors are formatted and emitted via `logger.error` in `lib/logger.ts`, serializing error messages and stack traces to JSON in production.
- **Database Concurrency Handlers:** Concurrency conflicts return HTTP 409 (`pages/api/bookings/[id]/status.ts:84`) or unique constraint rejections from Postgres RPCs.

## Cross-Cutting Concerns

**Logging:** Centralized via `lib/logger.ts`. Outputs formatted terminal logs in development and structured single-line JSON entries in production for log forwarders (CloudWatch, Datadog).
**Validation:** Centralized via Zod schemas in `lib/validations.ts`. Request payloads are parsed before reaching core business logic.
**Authentication:** Managed through Supabase JWTs. Validated at the API boundary via `withAuth` (`lib/apiAuth.ts`) and verified on the client via `supabase.auth.getUser()`.
**Internationalization:** Trilingual support (English, Hindi, Marathi) provided via `lib/i18n.js` and `lib/translations.js`, featuring Devanagari numbering system formatting and Google Translate synchronization.

---

*Architecture analysis: 2026-09-19*
