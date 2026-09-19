---
last_mapped_commit: 5f86afb2c4dee2caa1603def88e41ce4e33c7190
last_mapped_at: 2026-09-19
---
# External Integrations

**Analysis Date:** 2026-09-19

## APIs & External Services

**SMS & Messaging Services:**

- Notification Dispatcher - Dispatches SMS and WhatsApp slot booking confirmations and status alerts to farmers (`lib/notify.js`, `pages/api/notify/send.js`)
  - SDK/Client: Direct HTTP `fetch` / internal helper `sendNotification`
  - Auth: `SMS_API_KEY` (for SMS gateways such as Fast2SMS/Twilio) and `WHATSAPP_API_TOKEN` (for Meta WhatsApp Cloud API `https://graph.facebook.com/v19.0/`)
  - Internal Security: Endpoint `/api/notify/send` enforces server-to-server caller verification using `SUPABASE_SERVICE_ROLE_KEY` Bearer token
- WhatsApp Click-to-Chat - Generates one-tap preformatted booking confirmations for farmers to share via WhatsApp (`pages/farmer/dashboard.js`)
  - SDK/Client: Direct browser navigation via `https://wa.me/?text=...` URI scheme
  - Auth: None (public standard)

**QR Code & Token Generation:**

- QRServer API - Generates real-time scannable QR code images for digital gate passes and token receipts (`pages/farmer/gate-pass/[id].js`, `pages/farmer/token/[id].js`)
  - Endpoint: `https://api.qrserver.com/v1/create-qr-code/`
  - SDK/Client: Native HTML `<img>` tag with encoded JSON payload parameters
  - Auth: None (public unauthenticated API)

**Translation & Localization:**

- Google Translate Web Element - Provides real-time client-side translation across 11 Indian languages (Hindi, Marathi, Tamil, Telugu, Gujarati, Kannada, Malayalam, Punjabi, Bengali, Odia, English) (`components/GoogleTranslate.js`, `lib/i18n.js`)
  - Endpoint: `//translate.google.com/translate_a/element.js`
  - SDK/Client: Dynamically injected script tag with DOM patch to prevent React hydration mismatch
  - Auth: None (public browser script)

**Voice & Audio Interfaces:**

- Browser Web Speech API - Provides trilingual text-to-speech audio guidance (Hindi, Marathi, English) and drives the interactive 1800-toll-free IVR feature phone simulator (`components/VoiceAssistance.js`, `pages/ivr-demo.js`, `lib/audioAlert.ts`)
  - SDK/Client: Native `window.speechSynthesis` and `SpeechSynthesisUtterance`
  - Auth: None (client browser capability)

**Interactive API Documentation:**

- Swagger UI / OpenAPI 3.0 - Generates interactive REST API specification and interactive testing console (`pages/api-docs.tsx`, `lib/swagger.ts`)
  - SDK/Client: `next-swagger-doc` and `swagger-ui-react`
  - Auth: Supports Bearer JWT authentication header for testing authenticated endpoints

## Data Storage

**Databases:**

- Supabase Managed PostgreSQL (PostgreSQL 15+) - Primary relational database managing farmers, centres, commodities, bookings, queue entries, gate passes, payments, and grievances (`supabase/schema.sql`, `supabase/migrations/`)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - Client: `@supabase/supabase-js` v2.116.0
  - Client Separation:
    - Browser Client (`lib/supabaseClient.js`): Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`, strictly bounded by PostgreSQL Row-Level Security (RLS)
    - Admin Server Client (`lib/supabaseAdmin.js`): Uses `SUPABASE_SERVICE_ROLE_KEY`, restricted to API routes (`pages/api/*`), bypassing RLS for atomic operations and administrative workflows
  - Stored Procedures & Database Functions (RPC):
    - `book_slot_atomic`: Concurrency-safe slot reservation executing `SELECT ... FOR UPDATE` locking on the centre row to enforce daily capacity, weekly limits, and eliminate duplicate booking race conditions (`supabase/migrations/00000000000000_init.sql`, `pages/api/bookings/create.ts`)
    - `recalculate_queue_for_date`: Recalculates queue positions and wait times atomically using `ROW_NUMBER() OVER (ORDER BY created_at ASC)` (`supabase_recalculate_queue.sql`)
    - `get_queue_position`: Computes live queue placement relative to active mandi check-ins (`supabase/schema.sql`)

**File Storage:**

- Local filesystem only (`public/` directory for PWA manifests, icons, static assets). Consignment gate pass metadata and security QR payloads are encoded directly as JSON strings within the `gate_passes.qr_code` database column (`pages/api/gate-passes/create.js`, `pages/farmer/gate-pass/[id].js`).

**Caching:**

- Server State In-Memory Cache: Managed by `@tanstack/react-query` (`QueryClient` configured in `components/Providers.tsx` with `staleTime: 5 min`, `gcTime: 30 min`, and query deduplication)
- Offline Client Storage: IndexedDB via `idb-keyval` (`lib/offlineQueue.ts`), persisting pending slot bookings during network loss with graceful fallback to browser `localStorage`
- Service Worker Cache: Workbox via `next-pwa` precaching static bundles, CSS, and application shell (`next.config.js`, `public/sw.js`)

## Authentication & Identity

**Auth Provider:**

- Supabase Auth (`supabase.auth`)
  - Implementation:
    - User Authentication: Email and password authentication internally wrapped by a mobile/Aadhaar OTP login simulator (`pages/index.js`, `lib/supabaseClient.js`)
    - Session Verification: JWT access token passed via `Authorization: Bearer <token>` header, validated on server API handlers using `supabaseAdmin.auth.getUser(token)` (`lib/apiAuth.ts`)
    - Role-Based Access Control (RBAC): Enforces roles (`farmer`, `officer`, `admin`) validated against the `profiles` table via higher-order route wrapper `withAuth(handler, { roles: [...] })` (`lib/apiAuth.ts`)
    - Database Row-Level Security: PostgreSQL policies restrict data access by user ID (`auth.uid() = farmer_id`) or verified officer/admin role (`supabase/schema.sql`, `supabase/migrations/20260919_security_fixes.sql`)

## Monitoring & Observability

**Error Tracking:**

- React Error Boundary (`components/ErrorBoundary.tsx`) providing client-side runtime exception containment with UI fallback
- No external third-party error monitoring service (e.g., Sentry) is currently configured

**Logs:**

- Custom Structured Logger (`lib/logger.ts`):
  - Production (`NODE_ENV === 'production'`): Outputs single-line serialized JSON objects (`JSON.stringify(entry)`) with log level, message, ISO timestamp, context metadata, and normalized error stack traces to standard output / error streams, formatted for cloud ingestion (Datadog, AWS CloudWatch, Grafana Loki)
  - Development / Test: Color-formatted console output with readable timestamp prefixes
- Telemetry & Web Vitals:
  - Core Web Vitals telemetry probe in `pages/_app.js` (`reportWebVitals`) capturing LCP, FID, CLS, INP, and TTFB metrics
  - Health probe endpoint at `/api/health` (`pages/api/health.ts`) validating uptime, environment, and live database query latency against Supabase

## CI/CD & Deployment

**Hosting:**

- Docker Container: Multi-stage Alpine container (`Dockerfile`) compiling Next.js into a standalone production server (`output: 'standalone'`), executed with non-root security user (`nextjs:nodejs`) on port 3000
- Orchestration: Docker Compose specification defined in `docker-compose.yml` with automated container healthcheck probing `/api/health`

**CI Pipeline:**

- GitHub Actions (`.github/workflows/ci.yml`):
  - Triggers on: Push and pull request to `main` and `master` branches
  - Job environment: `ubuntu-latest` with Node.js 18
  - Validation steps:
    1. Dependency verification (`npm ci`)
    2. TypeScript type-checking (`npm run type-check`)
    3. Unit and integration testing with code coverage (`npm test -- --coverage`)
    4. Next.js standalone application build (`npm run build`)
  - Secrets injected: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## Environment Configuration

**Required env vars:**

- `NEXT_PUBLIC_SUPABASE_URL`: Public HTTPS endpoint of the Supabase project
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon/public JWT key used in browser client
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (bypasses RLS; kept server-side only)
- `NODE_ENV`: Runtime execution environment (`development`, `test`, `production`)

**Optional env vars:**

- `NEXT_PUBLIC_SITE_URL`: Base application URL for absolute callbacks (defaults to `http://localhost:3000`)
- `SMS_API_KEY`: API authentication key for external SMS delivery gateway (Fast2SMS / Twilio)
- `WHATSAPP_API_TOKEN`: Bearer token for WhatsApp Cloud API message delivery

**Secrets location:**

- Local development: `.env.local` (present on disk, ignored by git per `.gitignore`)
- Docker deployments: Injected via host environment variables or `.env.local` referenced by `docker-compose.yml`
- CI/CD runner: Configured in GitHub Repository Secrets (`${{ secrets.* }}`)

## Webhooks & Callbacks

**Incoming:**

- None active in production; architectural design supports incoming IVR telecom PSTN webhooks (e.g., Asterisk/Twilio) routing DTMF bookings to `/api/bookings/create` (`pages/ivr-demo.js`)

**Outgoing:**

- Internal notification dispatcher (`pages/api/notify/send.js`, `lib/notify.js`) structured to send outbound webhook payloads to external SMS gateways (Fast2SMS Bulk V2) and WhatsApp Cloud API endpoints (`https://graph.facebook.com/v19.0/`)

---

*Integration audit: 2026-09-19*
