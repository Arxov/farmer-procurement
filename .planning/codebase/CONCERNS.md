---
last_mapped_commit: 5f86afb2c4dee2caa1603def88e41ce4e33c7190
last_mapped_at: 2026-09-19
---
# Codebase Concerns

**Analysis Date:** 2026-09-19

## Tech Debt

**Simulated Features and Hardcoded UI Mocks:**

- Issue: Several prominent features advertised in the UI are entirely client-side mock simulations without backend support or real integrations.
  - The "Cryptographic Audit Ledger Stream" with "SHA-256 hash-chained immutable event logs" in `pages/admin/dashboard.js` (lines 419-439) is a hardcoded static array of 4 mock objects with truncated hash strings.
  - The "Pre-Check AI Vision Scan" in `pages/officer/dashboard.js` (lines 182-196) is static JSX using `Math.random()` to display fake moisture and size uniformity metrics without any computer vision model or image capture.
  - The "IVR Telephony System" in `pages/ivr-demo.js` and `pages/demo/ivr.js` simulates telephone prompts in-browser using Web Speech `speechSynthesis` and `Math.random()` tokens without creating database records or connecting to telephony gateways.
  - The "Kisan Mitra AI Voice Assistant" in `components/KisanMitraWidget.js` has a disabled text input, hardcoded chat bubbles, and invokes `alert('Voice Assistant activated! (Simulation)')`.
  - The "3-Day Mandi Weather Forecast" in `components/WeatherAdvisory.js` uses a static hardcoded array (`32°C`, `30°C`, `26°C`) rather than calling IMD or OpenWeather APIs.
  - The "14-Day Price Trend" in `pages/farmer/price-outlook.js` uses `Math.random() * 25 + 5` to synthesize price fluctuations rather than querying Agmarknet or eNAM feeds.
- Files: `pages/admin/dashboard.js`, `pages/officer/dashboard.js`, `pages/ivr-demo.js`, `pages/demo/ivr.js`, `components/KisanMitraWidget.js`, `components/WeatherAdvisory.js`, `pages/farmer/price-outlook.js`
- Impact: High risk of false impressions regarding system capabilities during audits or user testing; these subsystems cannot function in production without complete redesigns.
- Fix approach: Implement real backend services or clearly label experimental prototype modules; connect to real data feeds (Agmarknet, IMD) and replace mock UI components with actual integration pipelines or standard forms.

**Global Prototype Monkey-Patching in Client Components:**

- Issue: Client-side components mutate global JavaScript prototypes at runtime:
  - `components/GoogleTranslate.js` (lines 9-31) overrides `Node.prototype.removeChild` and `Node.prototype.insertBefore` to suppress DOM manipulation errors caused by Google Translate modifying React's DOM tree.
  - `lib/i18n.js` (lines 46-57) overrides `Number.prototype.toLocaleString` globally inside a `useEffect` whenever the language changes to force Devanagari numbering.
- Files: `components/GoogleTranslate.js`, `lib/i18n.js`
- Impact: Mutating global DOM and standard library prototypes causes unpredictability, memory leaks, breaks external third-party libraries, and impairs React 18 concurrent hydration.
- Fix approach: Replace prototype monkey-patching with utility formatting functions (e.g. `formatNumber(value, locale)`) and use Next.js native multi-language routing or a dedicated React translation library (such as `next-intl` or `react-i18next`) instead of injecting Google Translate scripts directly into the DOM.

**Client-Side In-Memory Aggregations Over Large Data Payloads:**

- Issue: `pages/admin/dashboard.js` downloads up to 5,000 full booking records with multiple foreign relations and 5,000 payment records directly to the browser, then calculates status breakdowns, centre volumes, QC rejection statistics, 7-day trends, and total financial revenue using client-side JavaScript loops. A dedicated PostgreSQL analytics view (`mandi_analytics`) was created in `supabase/schema.sql` (lines 188-198) but is completely unreferenced by the application.
- Files: `pages/admin/dashboard.js`, `supabase/schema.sql`
- Impact: Substantial browser CPU load, sluggish interface responsiveness on low-end devices, megabytes of unnecessary network egress per page refresh, and inaccurate reporting once records exceed 5,000.
- Fix approach: Query database views (`mandi_analytics`) or dedicated Supabase RPC functions that return pre-aggregated SQL metrics (`COUNT`, `SUM`, `GROUP BY`) rather than streaming raw rows to the frontend.

**Dead Code and Unintegrated Environment Schema Validation:**

- Issue: `lib/env.ts` provides a comprehensive Zod environment validation schema (`validateEnv()`), but it is imported nowhere in the production codebase (only referenced in `__tests__/lib/env.test.ts`). All application files continue to read directly from unvalidated `process.env`.
- Files: `lib/env.ts`, `lib/supabaseClient.js`, `lib/supabaseAdmin.js`, `__tests__/lib/env.test.ts`
- Impact: Environment configuration failures occur late at runtime instead of failing fast during startup; default fallback values mask missing secrets in production.
- Fix approach: Import and enforce `env` from `lib/env.ts` in `lib/supabaseClient.js`, `lib/supabaseAdmin.js`, and `next.config.js`.

**Mixed JavaScript/TypeScript Codebase with Loose Compiler Settings:**

- Issue: The repository is split between JavaScript (`.js`) and TypeScript (`.ts`/`.tsx`). Core pages (`pages/farmer/book-slot.js`, `pages/farmer/dashboard.js`, `pages/admin/dashboard.js`) and admin APIs (`pages/api/admin/centres.js`, `pages/api/admin/commodities.js`) remain untyped JavaScript. Furthermore, `tsconfig.json` specifies `"strict": false`, `"target": "es5"`, and explicitly excludes `__tests__` from compiler verification.
- Files: `tsconfig.json`, `pages/farmer/book-slot.js`, `pages/farmer/dashboard.js`, `pages/admin/dashboard.js`, `pages/api/admin/centres.js`
- Impact: Type safety is compromised; runtime errors (such as `undefined` property access) are not caught during `npm run type-check`; test suites can contain broken type references without failing CI.
- Fix approach: Enable `"strict": true` in `tsconfig.json`, target `ES2022`, remove `__tests__` from `exclude`, and progressively migrate remaining `.js` files to `.ts`/`.tsx`.

**Redundant Multi-hop Database Queries in Grievance Listing:**

- Issue: In `pages/farmer/grievances.js` (lines 38-43), the client queries `bookings` table directly via `supabaseClient` to extract the farmer's booking IDs, and then calls `/api/grievances/list`. Inside `pages/api/grievances/list.js` (lines 9-12), the backend immediately runs the exact same query against `bookings` for `req.user.id`.
- Files: `pages/farmer/grievances.js`, `pages/api/grievances/list.js`
- Impact: Redundant database roundtrips that increase latency and database connection usage.
- Fix approach: Eliminate the client-side booking query in `pages/farmer/grievances.js` and rely entirely on `/api/grievances/list` to fetch the farmer's grievances.

**Committed Debug Artifacts and Ad-Hoc Scripts in Repository Root:**

- Issue: The repository root contains orphan debug and migration files:
  - `codebase-dump.txt` (536 KB text file containing code concatenation)
  - `logs.zip` (185-byte zip archive)
  - `migration-v2.js`, `check-db.js`, `check-data.js` (unstructured node scripts with hardcoded `.env.local` lookups)
- Files: `codebase-dump.txt`, `logs.zip`, `migration-v2.js`, `check-db.js`, `check-data.js`
- Impact: Repository bloat, confusion regarding migration procedures, and potential accidental git leakage of production logs or dumps.
- Fix approach: Delete `codebase-dump.txt`, `logs.zip`, and ad-hoc scripts; add `*.dump`, `codebase-dump.txt`, and `*.zip` to `.gitignore`. Standardize database migrations in `supabase/migrations/`.

---

## Known Bugs

**Active Service Worker Self-Destruction Loop on App Initialization:**

- Symptoms: Service worker is repeatedly registered by `next-pwa` and immediately unregistered on every page navigation or refresh, disabling offline caching and background synchronization.
- Files: `pages/_app.js` (lines 19-27)
- Trigger: Opening any page in the web application.
- Workaround: In `pages/_app.js`, `useEffect` executes `navigator.serviceWorker.getRegistrations().then(registrations => { for (let r of registrations) r.unregister(); });`. This debug workaround was added to bypass stale cache issues during development and was never removed. Removing lines 19-27 restores proper PWA service worker lifecycle.

**Admin Payments Table Pagination Absence and Truncated Financial Summaries:**

- Symptoms: The payments management page only displays the first 20 payment records; any payments beyond the 20th record cannot be viewed or updated. Furthermore, the summary metric cards ("Pending", "Paid", "Total") only calculate totals for the 20 items on screen rather than the entire database.
- Files: `pages/admin/payments.js` (lines 30, 50-56), `pages/api/admin/payments.ts` (lines 9-18)
- Trigger: Having more than 20 payment rows in the `payments` table.
- Workaround: Currently none in the UI. Requires adding pagination UI controls to `pages/admin/payments.js` and adding an endpoint or database query to fetch aggregate payment sums across the entire table.

**ESLint Interactive Prompt Blocking Automated Builds:**

- Symptoms: Executing `npm run lint` fails with an interactive CLI prompt (`? How would you like to configure ESLint?`) because no `.eslintrc*` or `eslint.config.js` configuration file exists in the project root.
- Files: `package.json` (line 12), `.github/workflows/ci.yml` (lines 26-30)
- Trigger: Running `npm run lint` in a non-interactive shell or CI/CD environment.
- Workaround: CI workflow deliberately omits `npm run lint` to avoid hanging. Needs a valid `.eslintrc.json` extending `next/core-web-vitals`.

**Silent Discarding of Failed Offline Bookings:**

- Symptoms: If an offline booking fails validation when reconnected (for instance, if the slot filled up while the farmer was offline, or the commodity season closed), the item is removed from the offline queue and discarded. The farmer sees no error notification or warning on the dashboard.
- Files: `lib/offlineQueue.ts` (lines 95-103), `pages/farmer/dashboard.js` (lines 74-79)
- Trigger: A farmer queues a booking while offline; upon reconnecting, the server returns an HTTP 400 status.
- Workaround: In `pages/farmer/dashboard.js`, `if (synced > 0)` is checked, but failed syncs (`failed > 0`) produce no alert or retry queue. The farmer believes the booking succeeded until checking the list.

**Silent Failure on Centre and Commodity Deletion:**

- Symptoms: Clicking "Delete" on a centre or commodity that has associated bookings fails without showing any error message.
- Files: `pages/admin/centres.js` (lines 69-78), `pages/admin/commodities.js` (lines 69-78)
- Trigger: Deleting a centre or commodity referenced by existing foreign keys in the `bookings` table.
- Workaround: The fetch call does not check `res.ok` or inspect the response JSON; it immediately invokes `load()`, leaving the UI state unchanged with no feedback for the administrator.

---

## Security Considerations

**Hardcoded Demo Credentials and Static OTP Bypass:**

- Risk: Critical authentication bypass. The root login page maps fixed phone numbers to seeded accounts (`farmer@demo.com`, `officer@demo.com`, `admin@demo.com`) with a hardcoded password (`password123`). Entering phone `0202555123` and OTP `123456` immediately grants full platform administrator access. No real SMS OTP provider is wired up.
- Files: `pages/index.js` (lines 7-11, 55-76)
- Current mitigation: None. This bypass was committed to the `main` branch (`7baa603 Revert index.js to use universal OTP login bypass`).
- Recommendations: Implement standard Supabase Phone Auth with Twilio, Fast2SMS, or MSG91 OTP delivery; remove `CREDENTIAL_MAP` and static `123456` OTP checks; protect staging credentials behind environment flags (`process.env.ENABLE_DEMO_LOGIN === 'true'`).

**Docker Build Image Insecurity and Static Bundle Variable Inlining:**

- Risk: When building Docker containers via `Dockerfile`, `npm run build` runs without build arguments for `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Next.js bakes the fallback values (`https://dummy-url.supabase.co`) into the static production JavaScript bundles. At runtime, passing environment variables in `docker-compose.yml` does NOT update already compiled client bundles, causing client authentication and database queries in the Docker container to target a dummy host.
- Files: `Dockerfile` (lines 13-21), `docker-compose.yml` (lines 12-18), `lib/supabaseClient.js` (lines 4-5)
- Current mitigation: Fallback strings prevent build failures, but produce non-functional production containers.
- Recommendations: Add `ARG NEXT_PUBLIC_SUPABASE_URL` and `ARG NEXT_PUBLIC_SUPABASE_ANON_KEY` to the `builder` stage in `Dockerfile`, or dynamically read configuration at runtime using `publicRuntimeConfig` / window configuration injection.

**Profile Role Modification RLS Incompatibility:**

- Risk: In `supabase/migrations/20260919_security_fixes.sql` (lines 16-18), `REVOKE UPDATE (role) ON profiles FROM authenticated` was introduced to prevent privilege escalation. However, `pages/register.js` (lines 73-81) executes an `upsert` specifying `role: role`. In PostgreSQL, performing `INSERT ... ON CONFLICT (id) DO UPDATE` where `role` is included in the target update column list triggers a permission denied error for authenticated users, breaking legitimate profile updates for farmers.
- Files: `pages/register.js`, `supabase/migrations/20260919_security_fixes.sql`
- Current mitigation: None in client code.
- Recommendations: Separate user registration/profile updates from role assignment. Profile editing in `pages/register.js` should never submit the `role` column in the update payload; role alterations must occur strictly through server-side admin endpoints (`pages/api/admin/users.js`).

**HTTP Permissions-Policy Disabling Required Hardware Capabilities:**

- Risk: `next.config.js` configures the HTTP header `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`. This explicitly instructs the browser to block all camera and microphone access. Consequently, any QR code scanning (e.g. at mandi gates), visual crop inspection capture, and speech input for the vernacular voice assistant are completely blocked by the browser.
- Files: `next.config.js` (lines 14-16)
- Current mitigation: None.
- Recommendations: Adjust `Permissions-Policy` to `camera=(self), microphone=(self), geolocation=(self)` to permit access on the application's origin.

**Unsigned QR Code Gate Passes:**

- Risk: The gate pass QR payload generated in `pages/api/gate-passes/create.js` (lines 35-44) and `pages/api/bookings/[id]/status.ts` (lines 116-122) contains plain JSON with booking metadata and has no cryptographic signature (HMAC-SHA256 or RSA). Anyone can craft an arbitrary JSON string with a valid booking ID and present it at the mandi gate.
- Files: `pages/api/gate-passes/create.js`, `pages/api/bookings/[id]/status.ts`
- Current mitigation: The gate pass is verified visually against the database, but automated scanners without network access cannot verify authenticity.
- Recommendations: Sign the QR token using an HMAC secret or asymmetric private key (e.g. JWT format) that can be verified offline by scanning devices using a public key.

---

## Performance Bottlenecks

**Massive Data Payloads on Admin Dashboard Initialization:**

- Problem: The admin dashboard requests up to 5,000 full booking objects with multi-table joins and 5,000 payment objects over the public Supabase REST API on initial load.
- Files: `pages/admin/dashboard.js` (lines 44-50, 99-106)
- Cause: Lack of server-side data aggregation and pagination; the frontend pulls raw rows to calculate metrics locally.
- Improvement path: Query the pre-defined PostgreSQL view `mandi_analytics` or create an RPC `/api/admin/stats` returning pre-aggregated counts, reducing data transfer from several megabytes to a single lightweight JSON payload under 5 KB.

**Global Realtime Webhook Stampede on Queue Entries:**

- Problem: In `pages/farmer/dashboard.js` (lines 109-111), the Supabase realtime listener subscribes to `table: 'queue_entries'` with NO row-level filter.
- Files: `pages/farmer/dashboard.js` (lines 109-111)
- Cause: Every queue entry creation, check-in, or recalculation across any mandi in the entire state broadcasts a WebSocket event to all currently connected farmers, causing each client to invalidate and refetch their bookings via React Query.
- Improvement path: Scope the realtime subscription filter to the farmer's own booking ID (`filter: id=in.(...)`) or utilize a centre-specific channel only when viewing a live queue token.

**Sequential Haversine Distance and Window Slot Calculation in Suggestion Engine:**

- Problem: `/api/bookings/suggest` loads all centres and all active bookings across the state for 3 upcoming dates into server memory, then iterates through every centre, computing trigonometric Haversine calculations and evaluating window slots sequentially.
- Files: `pages/api/bookings/suggest.js` (lines 67-139)
- Cause: Calculations are performed in Node.js serverless runtime rather than leveraging PostgreSQL spatial indexing (`PostGIS`) or database-level queries.
- Improvement path: Utilize PostGIS (`ST_Distance`) with index support in Supabase to find nearby centres within a radius, filtering available capacity in SQL before returning the top candidates.

---

## Fragile Areas

**Single-Pass State Machine with Non-Recoverable Steps:**

- Files: `pages/api/bookings/[id]/status.ts`, `pages/officer/dashboard.js`
- Why fragile: The procurement workflow follows a strict chronological progression: `booked -> checked_in -> weighed -> quality_checked -> accepted -> paid`. If an officer enters an erroneous weight or quality metric, there is no correction or rollback state. The only exit transition is `cancelled`, which terminates the slot. Furthermore, `status.ts` performs multiple non-transactional mutations (updating booking status, updating `queue_entries`, inserting into `payments`, inserting into `gate_passes`, and invoking `recalculate_queue_for_date`). A failure halfway through (e.g. payment insert failure) leaves the booking in an inconsistent state.
- Safe modification: Encapsulate the status advancement and dependent table writes inside an atomic PostgreSQL function (`advance_booking_status`), and allow officers with appropriate permissions to edit weighment values prior to final acceptance.
- Test coverage: Zero automated test coverage for `pages/api/bookings/[id]/status.ts`.

**Seasonal Procurement Demo Bypass Flags:**

- Files: `pages/farmer/book-slot.js` (lines 479, 504)
- Why fragile: The commodity selection dropdown contains hardcoded short-circuits: `return true; // Bypass strict season check for demo`. The procurement dates configured in `centre_commodities` are partially inconsistent or empty. Removing this bypass flag immediately causes the UI to report "No crops are currently being procured at this mandi for the current season."
- Safe modification: Seed comprehensive procurement date ranges for all commodities in `supabase/seed.sql` before removing the bypass logic.
- Test coverage: Not covered in unit or integration tests.

**Dynamic Import and Browser Global Dependencies during Prerendering:**

- Files: `pages/_app.js`, `components/VoiceAssistance.js`, `components/GoogleTranslate.js`, `components/InstallPwaBanner.js`
- Why fragile: Components accessing `window.speechSynthesis`, `navigator.serviceWorker`, `localStorage`, or `sessionStorage` have triggered prerendering crashes during `next build` (e.g. commit `0295f94 Restore VoiceAssistance import to fix prerendering error`). Adding any component using window globals without `typeof window !== 'undefined'` checks or Next.js `dynamic(..., { ssr: false })` immediately breaks the production build.
- Safe modification: Ensure all browser-only modules are dynamically imported with `{ ssr: false }` or encapsulated in `useEffect`.
- Test coverage: Covered only indirectly via `npm run build`.

---

## Scaling Limits

**Arbitrary 5,000-Row Cutoff on Administrative Analytics:**

- Current capacity: Exactly 5,000 booking rows and 5,000 payment rows.
- Limit: Once statewide bookings exceed 5,000, older records are dropped from the query ordering (`order('created_at', { ascending: false }).limit(5000)`). Consequently, historic volume graphs, total farmer counts, state-level procurement metrics, and capacity utilization calculations become incorrect.
- Scaling path: Shift all reporting metrics to SQL aggregation functions (`COUNT()`, `SUM()`) and database views.

**In-Memory Centre Stats Limitation:**

- Current capacity: 2,000 bookings per centre (`.limit(2000)` in `pages/api/centres/[id]/stats.js`).
- Limit: A high-volume APMC yard handling more than 2,000 seasonal bookings will truncate its stats calculation, resulting in inaccurate rejection rates and processed tonnage.
- Scaling path: Compute stats directly in PostgreSQL using `SELECT COUNT(DISTINCT farmer_id), SUM(actual_weight_quintals)... WHERE centre_id = $1`.

**Direct Supabase Client Connections Without PgBouncer:**

- Current capacity: Limited by Supabase PostgreSQL max client connection pool (typically 60-120 connections on standard tiers).
- Limit: Under high concurrency during procurement spikes, serverless functions in Next.js create individual database connections that quickly exhaust the database connection pool.
- Scaling path: Configure Supavisor / PgBouncer connection pooling port (6543) in `SUPABASE_URL` for serverless route handlers.

---

## Dependencies at Risk

**React Version Mismatch with DevDependencies:**

- Package: `@types/react` (`^19.2.18`) and `@types/react-dom` (`^19.2.5`) vs `react` (`^18.3.1`) and `react-dom` (`^18.3.1`)
- Risk: React 19 type definitions are installed in `devDependencies` while running React 18 in `dependencies`.
- Impact: Incompatible type definitions for React hooks (`useTransition`, `useActionState`), `ref` forwarding, and JSX elements can cause type-checking issues and IDE confusion.
- Migration plan: Downgrade `@types/react` and `@types/react-dom` to `^18.3.0` to match the installed React 18 runtime.

**Unstable Canary Zod Dependency:**

- Package: `zod` (`^4.5.4`)
- Risk: Zod 4 is an experimental release branch. The stable production release of Zod is `^3.23.x`.
- Impact: Breaking changes or syntax inconsistencies with schema validation across `lib/validations.ts` and `lib/env.ts`.
- Migration plan: Pin to stable `zod: ^3.23.8`.

**Deprecated PWA Package:**

- Package: `next-pwa` (`^5.6.0`)
- Risk: `next-pwa` has not received maintenance updates for modern Next.js features and Webpack 5 standalone builds.
- Impact: Build warnings, service worker generation conflicts, and build cache corruption.
- Migration plan: Migrate to `@ducanh2912/next-pwa` or Serwist.

---

## Missing Critical Features

**Production Notification & Telephony Delivery:**

- Problem: SMS and WhatsApp dispatch in `lib/notify.js` and `pages/api/notify/send.js` prints to `console.log`.
- Blocks: Farmers without active internet access cannot receive slot confirmation tokens, gate passes, or arrival notifications via SMS.

**Public Financial Management System (PFMS) & DBT Integration:**

- Problem: Payment processing in `pages/api/admin/payments.ts` simply updates a status column and generates pseudo-random UTR strings (`UTR${Date.now()}...`).
- Blocks: Real disbursement of Direct Benefit Transfer (DBT) funds into farmers' Aadhaar-linked bank accounts cannot be executed.

**Real IVR Telephony Gateway:**

- Problem: There is no backend telephony webhook handler (e.g. for Twilio, Exotel, or Knowlarity) to process DTMF keypresses from actual feature phones.
- Blocks: 2G feature phone users cannot call the 1800 toll-free number to book slots or check queue positions in reality.

**Comprehensive Administrative Audit Logging Schema:**

- Problem: No database table or backend logging service exists to record administrative actions, role modifications, or officer grading overrides.
- Blocks: Regulatory accountability and anti-fraud verification cannot be proven to procurement authorities.

---

## Test Coverage Gaps

**Server-Side API Routes (`pages/api/**`):**

- What's not tested: Entire backend API surface (`pages/api/bookings/create.ts`, `pages/api/bookings/[id]/status.ts`, `pages/api/bookings/[id]/rate.ts`, `pages/api/centres/[id]/availability.ts`, `pages/api/bookings/suggest.js`, `pages/api/admin/**`, `pages/api/gate-passes/create.js`, `pages/api/grievances/**`).
- Files: All files under `pages/api/` (except `pages/api/health.ts` which has minimal coverage).
- Risk: Regressions in booking creation, capacity enforcement, role-based authorization, and payment processing will deploy completely undetected.
- Priority: High

**Authentication and Authorization Middleware (`lib/apiAuth.ts`):**

- What's not tested: Bearer token parsing, role verification logic (`withAuth`), and permission rejection (401/403 responses).
- Files: `lib/apiAuth.ts`
- Risk: Flaws in authorization checks could permit farmers or unauthenticated callers to access admin endpoints.
- Priority: High

**Data Fetching and Mutation Hooks (`hooks/useBookings.ts`, `hooks/usePayments.ts`):**

- What's not tested: `fetchFarmerBookings`, `fetchOfficerBookings`, and `useUpdateBookingStatus` mutation flows.
- Files: `hooks/useBookings.ts`, `hooks/usePayments.ts`
- Risk: React Query cache invalidation and error propagation bugs break dashboard updates.
- Priority: High

**Critical User Interface Workflows (`pages/**`):**

- What's not tested: End-to-end user workflows on `pages/farmer/book-slot.js`, `pages/farmer/dashboard.js`, `pages/officer/dashboard.js`, and `pages/admin/dashboard.js`.
- Files: All pages under `pages/farmer/`, `pages/officer/`, and `pages/admin/`.
- Risk: Broken state interactions, unhandled form errors, and UI layout crashes.
- Priority: Medium

**Offline Queueing and Synchronization Edge Cases (`lib/offlineQueue.ts`):**

- What's not tested: Background sync registration failure handling, IndexedDB fallback to localStorage under quota exceeded exceptions, and partial sync recovery.
- Files: `lib/offlineQueue.ts`
- Risk: Farmers losing queued offline bookings during intermittent network connectivity.
- Priority: Medium

---

*Concerns audit: 2026-09-19*
