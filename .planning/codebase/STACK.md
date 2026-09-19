---
last_mapped_commit: 5f86afb2c4dee2caa1603def88e41ce4e33c7190
last_mapped_at: 2026-09-19
---
# Technology Stack

**Analysis Date:** 2026-09-19

## Languages

**Primary:**

- TypeScript 5.9.3 - Core application logic, API route handlers, data models, validation schemas, React hooks, and test suites (`lib/apiAuth.ts`, `lib/env.ts`, `lib/validations.ts`, `lib/logger.ts`, `hooks/useBookings.ts`, `types/database.ts`, `types/api.ts`)
- JavaScript (ESNext / React JSX) - Presentation components, admin/officer dashboard pages, PWA service worker scripts, and database utility scripts (`pages/index.js`, `pages/farmer/dashboard.js`, `pages/admin/dashboard.js`, `components/AdminCharts.js`, `public/sw.js`, `seed-data.js`)

**Secondary:**

- PL/pgSQL (PostgreSQL 15+) - Atomic database transactional functions, queue recalculation logic, table triggers, and Row Level Security policies (`supabase/schema.sql`, `supabase/migrations/00000000000000_init.sql`, `supabase/migrations/20260919_security_fixes.sql`, `supabase_recalculate_queue.sql`)
- CSS3 / PostCSS - Utility-first styling with responsive design, dynamic dark mode switching, and custom animations (`styles/globals.css`, `tailwind.config.js`, `postcss.config.js`)
- Dockerfile / YAML - Containerization instructions and CI/CD workflow automation (`Dockerfile`, `docker-compose.yml`, `.github/workflows/ci.yml`)

## Runtime

**Environment:**

- Node.js 18.x / 20.x - Development and test runtime executed on Node.js 18 in GitHub Actions CI (`.github/workflows/ci.yml`); production runner packages Node.js 20 on Alpine Linux (`Dockerfile`)
- Target: ES5 / ESNext (`tsconfig.json`)

**Package Manager:**

- npm (v9 / v10)
- Lockfile: present (`package-lock.json`, lockfileVersion: 3)

## Frameworks

**Core:**

- Next.js 14.2.5 - Full-stack React framework using Pages Router (`pages/`), providing SSR/SSG, edge-compatible API routes (`pages/api/`), standalone output bundling (`next.config.js`), and built-in security header configurations
- React 18.3.1 - UI component tree and rendering engine (`package.json`)
- React DOM 18.3.1 - DOM mounting and browser hydration (`package.json`)

**Testing:**

- Jest 30.5.1 - Unit and component test runner (`jest.config.js`, `package.json`)
- jest-environment-jsdom 30.5.1 - Browser DOM simulation environment for headless execution (`jest.config.js`)
- @testing-library/react 16.3.3 - React component testing harness (`__tests__/components/`)
- @testing-library/jest-dom 7.0.1 - Custom DOM matchers for Jest assertions (`jest.setup.js`)
- @testing-library/user-event 14.6.7 - High-fidelity browser interaction simulation (`package.json`)

**Build/Dev:**

- Tailwind CSS 3.4.4 - Utility-first CSS engine with class-based dark mode (`tailwind.config.js`, `postcss.config.js`)
- PostCSS 8.4.38 - CSS post-processing pipeline (`postcss.config.js`)
- Autoprefixer 10.4.19 - Vendor prefix automation for browser compatibility (`postcss.config.js`)
- next-pwa 5.6.0 - Workbox-powered Progressive Web App service worker compiler and asset precaching (`next.config.js`, `public/manifest.json`)
- TypeScript 5.9.3 - Type checker configured with non-emitting compiler checks (`tsconfig.json`, `package.json`)

## Key Dependencies

**Critical:**

- `@supabase/supabase-js` ^2.116.0 - Official client library providing PostgreSQL connectivity, Row Level Security (RLS) enforcement, database RPC calls, and Supabase Auth session handling (`lib/supabaseClient.js`, `lib/supabaseAdmin.js`)
- `@tanstack/react-query` ^5.102.8 - Asynchronous state manager handling server cache, automatic stale-while-revalidate invalidation, and query deduplication (`components/Providers.tsx`, `hooks/useBookings.ts`, `hooks/useCentres.ts`, `hooks/useCommodities.ts`, `hooks/usePayments.ts`)
- `zod` ^4.5.4 - Runtime schema validation library enforcing strict input validation on API endpoints and environment variables (`lib/validations.ts`, `lib/env.ts`)
- `idb-keyval` ^6.3.0 - Lightweight IndexedDB promise-based key-value wrapper powering the offline booking queue and browser background sync (`lib/offlineQueue.ts`)
- `framer-motion` ^13.2.0 - Hardware-accelerated UI animation library for route transitions, bottom sheets, and modal components (`pages/_app.js`, `components/PageTransition.tsx`, `components/KisanMitraWidget.js`)
- `next-themes` ^0.4.6 - Zero-flash theme switcher supporting system preferences, dark mode, and light mode (`pages/_app.js`, `components/ThemeToggle.tsx`)
- `next-swagger-doc` ^0.5.0 - JSDoc-to-OpenAPI 3.0 specification generator scanning Next.js API endpoints (`lib/swagger.ts`, `pages/api-docs.tsx`)
- `swagger-ui-react` ^5.32.14 - Interactive interactive OpenAPI documentation UI (`pages/api-docs.tsx`)

**Infrastructure:**

- `@tanstack/react-query-devtools` ^5.102.8 - Developer tools panel for React Query cache inspection during development (`components/Providers.tsx`)
- `canvas-confetti` ^1.9.4 - Canvas-based particle animation displayed upon successful slot reservation (`pages/farmer/book-slot.js`)
- `dotenv` ^18.0.0 - Local environment configuration loader for CLI seed and migration utilities (`seed-data.js`, `check-db.js`)
- `@types/node` ^26.4.1, `@types/react` ^19.2.18, `@types/react-dom` ^19.2.5, `@types/jest` ^30.0.0 - Ambient type definitions for TypeScript compilation (`package.json`)

## Configuration

**Environment:**

- Runtime variables validated via Zod schema in `lib/env.ts` (`validateEnv()`)
- Development environment variables stored in `.env.local` (local only, ignored in git)
- Example variables documented in `.env.local.example`
- Critical configuration keys:
  - `NEXT_PUBLIC_SUPABASE_URL`: Public Supabase endpoint
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous JWT key for browser client
  - `SUPABASE_SERVICE_ROLE_KEY`: Privileged service role secret key for server API routes bypassing RLS
  - `NEXT_PUBLIC_SITE_URL`: Base application host URL for absolute links
  - `SMS_API_KEY`: API token for third-party SMS delivery gateways
  - `NODE_ENV`: Runtime execution stage (`development`, `test`, `production`)

**Build:**

- `next.config.js`: Next.js production build configuration specifying `output: 'standalone'`, PWA generation via `withPWA`, and mandatory HTTP security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`)
- `tsconfig.json`: TypeScript configuration with `@/*` root path mapping, `allowJs: true`, `strict: false`, `noEmit: true`, and JSDOM/Jest exclusions
- `tailwind.config.js`: Tailwind content scanners across `pages/`, `components/`, `lib/`, with `darkMode: 'class'`
- `postcss.config.js`: PostCSS plugin configuration (`tailwindcss`, `autoprefixer`)
- `jest.config.js`: Jest configuration utilizing `next/jest` wrapper, mapping `@/*` alias and ignoring `.next/` and `node_modules/`
- `jest.setup.js`: Test bootstrap mocking `@testing-library/jest-dom` and browser `window.speechSynthesis`

## Platform Requirements

**Development:**

- Node.js 18.x or 20.x
- npm 9+ or 10+
- Modern web browser supporting Web Speech API (`window.speechSynthesis`), IndexedDB, and Service Workers (Chrome 90+, Edge 90+, Firefox 90+, Safari 15+)
- Access to Supabase PostgreSQL cloud instance or local Supabase emulator

**Production:**

- Standalone Docker image based on `node:20-alpine` (`Dockerfile`) with non-root system user (`nextjs:nodejs`), exposed on port 3000
- Orchestration compatible with Docker Compose (`docker-compose.yml`), Kubernetes, AWS ECS, Google Cloud Run, or Vercel
- Upstream managed Supabase PostgreSQL instance with RLS enabled and required RPC functions installed

---

*Stack analysis: 2026-09-19*
