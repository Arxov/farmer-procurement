---
last_mapped_commit: 5f86afb2c4dee2caa1603def88e41ce4e33c7190
last_mapped_at: 2026-09-19
---
# Codebase Structure

**Analysis Date:** 2026-09-19

## Directory Layout

```text
farmer-procurement/
├── __tests__/                      # Test suites (Jest + React Testing Library)
│   ├── components/                 # Component render and behavior unit tests
│   ├── hooks/                      # TanStack Query hook tests
│   └── lib/                        # Utility, validation, and offline queue unit tests
├── components/                     # Reusable React UI components
│   ├── AdminCharts.js              # Custom SVG and Canvas analytics visualizations
│   ├── BookingStepper.js           # Visual status progression stepper
│   ├── CropBadge.tsx               # Crop icon badge with theme color mapping
│   ├── ErrorBoundary.tsx           # React class error boundary wrapper
│   ├── FarmerBottomNav.js          # Mobile navigation bar for farmer screens
│   ├── GoogleTranslate.js          # Script injector for Google Translate
│   ├── InstallPwaBanner.js         # PWA install prompt banner
│   ├── KisanMitraWidget.js         # AI voice and vernacular chat assistant widget
│   ├── LanguageToggle.js           # Multi-language selector button
│   ├── MandiFeedback.js            # Rating modal with tag selections
│   ├── NotificationBell.js         # Alert and payment notification bell dropdown
│   ├── OfflineBanner.js            # Offline network detection banner
│   ├── PageTransition.tsx          # Framer Motion page transition wrapper
│   ├── Providers.tsx               # TanStack QueryClientProvider wrapper
│   ├── PullToRefresh.js            # Touch gesture pull-to-refresh component
│   ├── Skeleton.tsx                # Loading skeleton placeholders
│   ├── ThemeToggle.tsx             # Dark/light theme toggle button
│   ├── Toast.js                    # Global toast notification context and provider
│   ├── VoiceAssistance.js          # Web Speech API voice synthesis readout
│   └── WeatherAdvisory.js          # 3-day local mandi weather and moisture advisory
├── hooks/                          # TanStack React Query custom hooks
│   ├── useBookings.ts              # Hooks for farmer and officer booking queries
│   ├── useCentres.ts               # Hook for fetching procurement centres
│   ├── useCommodities.ts           # Hook for fetching commodities and MSP rates
│   └── usePayments.ts              # Hook for admin paginated payment management
├── lib/                            # Application logic, utilities, and API wrappers
│   ├── apiAuth.ts                  # Server-side JWT auth middleware and RBAC guard
│   ├── audioAlert.ts               # Web Audio API procedural chime and haptic triggers
│   ├── cropIcons.ts                # Commodity emoji and Tailwind style configuration
│   ├── env.ts                      # Zod-validated environment variable loader
│   ├── i18n.js                     # Trilingual language context and Google Translate sync
│   ├── logger.ts                   # Structured JSON logger with log levels
│   ├── notify.js                   # Direct server-to-server notification dispatcher
│   ├── offlineQueue.ts             # IndexedDB booking queue and background sync
│   ├── pagination.ts               # Offset pagination helper for database queries
│   ├── supabaseAdmin.js            # Privileged service-role Supabase client (Server only)
│   ├── supabaseClient.js           # Public anon-key Supabase client (Browser safe)
│   ├── swagger.ts                  # OpenAPI / Swagger specification generator
│   ├── translations.js             # Trilingual translation dictionaries (EN, HI, MR)
│   └── validations.ts              # Zod schema definitions for API request bodies
├── pages/                          # Next.js Pages Router views and API handlers
│   ├── _app.js                     # Root application component and provider hierarchy
│   ├── _document.js                # Custom HTML document wrapper with font assets
│   ├── 404.tsx                     # Branded 404 Not Found page
│   ├── 500.tsx                     # Branded 500 Internal Server Error page
│   ├── api-docs.tsx                # Interactive Swagger UI documentation explorer
│   ├── index.js                    # OTP authentication screen and role redirector
│   ├── ivr-demo.js                 # Interactive browser IVR voice call simulation
│   ├── register.js                 # Farmer onboarding profile registration
│   ├── admin/                      # APMC Administrator portal screens
│   │   ├── centres.js              # Procurement centre capacity configuration
│   │   ├── commodities.js          # Commodity MSP rate and guideline management
│   │   ├── dashboard.js            # Realtime operations metrics and analytics dashboard
│   │   ├── grievances.js           # Farmer dispute review and resolution
│   │   ├── payments.js             # DBT payout disbursement tracking
│   │   └── users.js                # User role assignment and profile management
│   ├── api/                        # Next.js Serverless API endpoints
│   │   ├── admin/                  # Admin-only management endpoints
│   │   │   ├── centres.js          # Centre CRUD operations
│   │   │   ├── commodities.js      # Commodity CRUD operations
│   │   │   ├── grievances.js       # Dispute updates
│   │   │   ├── payments.ts         # Paginated payment list and status updates
│   │   │   └── users.js            # User role updates
│   │   ├── bookings/               # Slot booking management endpoints
│   │   │   ├── create.ts           # Atomic slot reservation (RPC)
│   │   │   ├── suggest.js          # Distance & payout-based slot recommendation
│   │   │   └── [id]/
│   │   │       ├── rate.ts         # Post-procurement farmer feedback
│   │   │       └── status.ts       # Chronological status workflow updater
│   │   ├── centres/                # Centre status endpoints
│   │   │   └── [id]/
│   │   │       ├── availability.ts # Daily capacity and remaining slot calculation
│   │   │       └── stats.js        # Centre historical volume and rejection metrics
│   │   ├── gate-passes/
│   │   │   └── create.js           # Gate pass generation for accepted bookings
│   │   ├── grievances/
│   │   │   ├── create.js           # Farmer grievance filing endpoint
│   │   │   └── list.js             # Farmer grievance retrieval endpoint
│   │   ├── notify/
│   │   │   └── send.js             # Internal notification trigger endpoint
│   │   └── health.ts               # Healthcheck probe for uptime and DB latency
│   ├── demo/
│   │   └── ivr.js                  # Alternate feature-phone IVR simulation view
│   ├── farmer/                     # Farmer mobile web portal screens
│   │   ├── book-slot.js            # Multi-step slot booking wizard with smart suggest
│   │   ├── dashboard.js            # Main farmer overview with live queue tracker
│   │   ├── grievances.js           # Dispute history and submission screen
│   │   ├── guidelines.js           # Fair Average Quality (FAQ) crop specifications
│   │   ├── net-calculator.js       # Payout and freight expense estimator
│   │   ├── price-outlook.js        # 14-day market price trend simulation
│   │   ├── gate-pass/
│   │   │   └── [id].js             # Printable digital gate pass with QR code
│   │   └── token/
│   │       └── [id].js             # Live token view with Vernacular TTS readout
│   └── officer/                    # Mandi Procurement Officer portal screens
│       └── dashboard.js            # Weighbridge, QC inspection, and acceptance workflow
├── public/                         # Static assets and PWA artifacts
│   ├── icon-192.png                # PWA manifest standard icon
│   ├── icon-512.png                # PWA manifest high-res splash icon
│   ├── manifest.json               # Web App Manifest for mobile installation
│   ├── sw.js                       # Service worker script generated by next-pwa
│   └── workbox-*.js                # Workbox service worker runtime
├── styles/                         # Styling stylesheets
│   └── globals.css                 # Tailwind CSS utility imports and base directives
├── supabase/                       # Database migrations and seed fixtures
│   ├── migration-v2.sql            # Secondary SQL schema migration
│   ├── schema.sql                  # Primary baseline database schema and RLS policies
│   ├── seed.sql                    # Initial development database seed records
│   └── migrations/                 # Versioned SQL migration files
│       ├── 00000000000000_init.sql # Baseline hardening, functions, and triggers
│       └── 20260919_security_fixes.sql # RLS and RPC execution security patches
├── types/                          # TypeScript shared type declarations
│   ├── api.ts                      # Request and response interface definitions
│   └── database.ts                 # Database entities and status union types
├── .github/workflows/              # Continuous Integration workflows
│   └── ci.yml                      # GitHub Actions automated test and type-check pipeline
├── Dockerfile                      # Multi-stage production container build definition
├── docker-compose.yml              # Local orchestration configuration
├── jest.config.js                  # Jest test runner configuration
├── jest.setup.js                   # Test environment setup and DOM mocks
├── next.config.js                  # Next.js configuration with security headers and PWA
├── package.json                    # Dependencies, scripts, and package metadata
├── tailwind.config.js              # Tailwind CSS theme configuration
└── tsconfig.json                   # TypeScript compiler configuration with path aliases
```

## Directory Purposes

**`pages/`:**

- Purpose: Application routing directory utilizing Next.js Pages router. Every file maps directly to a browser URL or API route.
- Contains: React components with page lifecycle exports (`getStaticProps`), API route handler functions (`NextApiRequest`, `NextApiResponse`).
- Key files: `pages/_app.js`, `pages/index.js`, `pages/farmer/dashboard.js`, `pages/officer/dashboard.js`, `pages/admin/dashboard.js`.

**`pages/api/`:**

- Purpose: Serverless backend endpoints providing REST APIs for mutations, integrations, and admin tasks.
- Contains: TypeScript and JavaScript API handlers wrapped with `withAuth` and Zod validators.
- Key files: `pages/api/bookings/create.ts`, `pages/api/bookings/[id]/status.ts`, `pages/api/admin/payments.ts`, `pages/api/health.ts`.

**`components/`:**

- Purpose: Reusable presentation and interaction components shared across page views.
- Contains: UI components, modals, form controls, visual steppers, loading skeletons, and custom charts.
- Key files: `components/Providers.tsx`, `components/BookingStepper.js`, `components/AdminCharts.js`, `components/MandiFeedback.js`.

**`hooks/`:**

- Purpose: Encapsulates TanStack React Query data fetching, caching, and mutation logic.
- Contains: TypeScript hooks exporting queries and mutations with typed return interfaces.
- Key files: `hooks/useBookings.ts`, `hooks/useCentres.ts`, `hooks/useCommodities.ts`, `hooks/usePayments.ts`.

**`lib/`:**

- Purpose: Core utility libraries, infrastructure clients, middleware, and domain models.
- Contains: Supabase clients, auth wrappers, validation schemas, logger, offline storage managers.
- Key files: `lib/apiAuth.ts`, `lib/supabaseClient.js`, `lib/supabaseAdmin.js`, `lib/validations.ts`, `lib/offlineQueue.ts`.

**`types/`:**

- Purpose: Centralized TypeScript type and interface definitions for compile-time safety across frontend and backend.
- Contains: Data models, database record representations, API contracts, status enums.
- Key files: `types/database.ts`, `types/api.ts`.

**`supabase/`:**

- Purpose: Relational database schema definitions, SQL migrations, stored procedures, and test fixtures.
- Contains: Raw SQL scripts, PL/pgSQL function definitions, and seed data.
- Key files: `supabase/schema.sql`, `supabase/migrations/00000000000000_init.sql`, `supabase/migrations/20260919_security_fixes.sql`.

**`__tests__/`:**

- Purpose: Automated automated test suites covering UI components, custom hooks, and utility functions.
- Contains: Jest test specifications (`.test.ts`, `.test.tsx`) using `@testing-library/react`.
- Key files: `__tests__/hooks/queries.test.tsx`, `__tests__/lib/validations.test.ts`, `__tests__/lib/offlineQueue.test.ts`.

## Key File Locations

**Entry Points:**

- `pages/_app.js`: Global root component wrapping all providers, themes, and route animations.
- `pages/index.js`: Authentication entry point resolving sessions and directing roles.
- `pages/api/health.ts`: Observability probe checking database and process readiness.
- `pages/api-docs.tsx`: OpenAPI Swagger UI entry point for exploring the REST API.

**Configuration:**

- `next.config.js`: Next.js compiler settings, security headers, and PWA options.
- `tsconfig.json`: TypeScript compiler options with `@/*` root path alias mapping.
- `tailwind.config.js`: Tailwind theme styling and content paths.
- `jest.config.js`: Jest testing framework and environment setup.
- `lib/env.ts`: Runtime environment variable schema and validation logic.

**Core Logic:**

- `lib/apiAuth.ts`: API token verification and RBAC enforcement wrapper (`withAuth`).
- `lib/validations.ts`: Zod validation schemas for booking, grievance, and status payloads.
- `pages/api/bookings/create.ts`: Slot reservation handler delegating to PostgreSQL atomic RPC.
- `pages/api/bookings/[id]/status.ts`: Sequential state machine orchestrating mandi workflow.
- `lib/offlineQueue.ts`: IndexedDB transaction queue enabling offline-capable booking.
- `supabase/migrations/00000000000000_init.sql`: PL/pgSQL procedure `book_slot_atomic`.

**Testing:**

- `jest.setup.js`: Global mocks for `matchMedia`, `IntersectionObserver`, and storage.
- `__tests__/lib/validations.test.ts`: Unit tests verifying input validation boundaries.
- `__tests__/lib/offlineQueue.test.ts`: Tests verifying IndexedDB queue enqueue, dequeue, and sync.
- `__tests__/components/ErrorBoundary.test.tsx`: Component test ensuring UI crash isolation.

## Naming Conventions

**Files:**

- React Page Views: `camelCase.js` or `kebab-case.js` (e.g., `pages/farmer/book-slot.js`, `pages/farmer/net-calculator.js`).
- React Components: `PascalCase.js` or `PascalCase.tsx` (e.g., `components/BookingStepper.js`, `components/CropBadge.tsx`).
- Custom Hooks: `camelCase.ts` prefixed with `use` (e.g., `hooks/useBookings.ts`, `hooks/useCentres.ts`).
- Utility & Library Files: `camelCase.ts` or `camelCase.js` (e.g., `lib/apiAuth.ts`, `lib/offlineQueue.ts`).
- Type Declarations: `camelCase.ts` (e.g., `types/database.ts`, `types/api.ts`).
- Test Files: `[TargetName].test.ts` or `[TargetName].test.tsx` co-located in `__tests__/`.

**Directories:**

- Route Segments: `kebab-case` or lowercase words (e.g., `pages/farmer/`, `pages/gate-passes/`).
- Dynamic Route Folders: `[param]` bracket notation (e.g., `pages/farmer/token/[id].js`, `pages/api/centres/[id]/`).

## Where to Add New Code

**New Feature (e.g., Warehouse Storage Booking):**

- Primary UI Page: Add page in `pages/farmer/warehouse-booking.js`.
- API Endpoints: Create handlers in `pages/api/warehouse/index.ts` and `pages/api/warehouse/[id].ts`.
- Validation Schema: Add `CreateWarehouseBookingSchema` in `lib/validations.ts`.
- Data Hook: Create hook in `hooks/useWarehouse.ts` with typed query keys.
- Types: Declare interfaces in `types/database.ts` and `types/api.ts`.
- Tests: Add unit tests in `__tests__/hooks/warehouse.test.tsx` and `__tests__/lib/warehouse.test.ts`.

**New Component/Module:**

- Shared UI Component: Add in `components/[ComponentName].tsx`.
- Component Tests: Add test in `__tests__/components/[ComponentName].test.tsx`.
- Barrel/Index: Import directly by file path (e.g., `import ComponentName from '@/components/ComponentName'`).

**Utilities & Shared Helpers:**

- Helper Function: Add utility module in `lib/[utilityName].ts`.
- Utility Tests: Add test in `__tests__/lib/[utilityName].test.ts`.

**Database Migration:**

- New Schema / RPC: Add SQL script in `supabase/migrations/[YYYYMMDD]_[description].sql` and update `supabase/schema.sql`.

## Special Directories

**`.planning/`:**

- Purpose: Project roadmap, milestone specifications, and codebase architecture documentation.
- Generated: No (written and maintained by GSD tooling).
- Committed: Yes.

**`public/`:**

- Purpose: Unbundled static assets served directly at root path (PWA manifest, icons, service worker).
- Generated: Partially (`sw.js` and `workbox-*.js` generated by `next-pwa` build; icons committed).
- Committed: Yes.

**`supabase/migrations/`:**

- Purpose: Versioned immutable SQL migration scripts applied to Supabase database.
- Generated: No.
- Committed: Yes.

**`types/`:**

- Purpose: Project-wide TypeScript ambient and structural type contracts.
- Generated: No.
- Committed: Yes.

---

*Structure analysis: 2026-09-19*
