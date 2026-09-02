# TaxBook — Architecture

## Overview
TaxBook is a Persian (RTL) financial record manager. Records (code, project, type, date, party, amount, tags, related) live inside **workspaces** with role-based access: `owner > admin > editor > viewer`.

## Frontend
- React 19 + Vite 8 (Rolldown) + TypeScript + Tailwind CSS 4.
- Single-page app shell (`src/App.tsx`) with route-per-tab and lazy-loaded pages/chunks.
- UI primitives in `src/components/ui` (Radix-based; native fallbacks where Radix isn't available).
- Server state is managed by **TanStack Query** behind a `useSWR`-compatible shim (`src/hooks/useSWR.ts`): all caching, deduplication, invalidation and refetching goes through a module-level `QueryClient` singleton. `Zustand` is reserved for client/UI state in a later phase; never put server data in client state.
- Offline/local persistence: `src/hooks/useWorkspaceData.ts` (localStorage), PWA service worker (`public/sw.js`).
- Vendor chunking: `vendor-react`, `vendor-charts` (apexcharts), `vendor-export` (jspdf/html2canvas/xlsx) configured in `vite.config.js`.

## Backend
- Express app composed in `server/index.js`; route modules under `server/routes/`.
- `server/config/env.js` — single validated source of environment truth; fails fast in production.
- `server/middleware/auth.js` — JWT auth + workspace role hierarchy.
- `server/errors.js` — `AppError`, central error handler (incl. FTS5 corruption self-healing), `asyncHandler`.
- `server/db.js` — SQLite (WAL), integrity check + auto-recovery, FTS5, idempotent seeding.
- Migrations: `server/migrations/*` applied by `server/migrate.js` (tracked in `schema_migrations`).
- WebSocket: `server/ws.js` broadcasts workspace-scoped events (`record:created|updated|deleted`).

## Request lifecycle
1. `X-Request-Id` assigned (or honored from proxy) → response header + structured log.
2. CORS allow-list (`ALLOWED_ORIGINS`), Helmet, JSON body limit (`JSON_BODY_LIMIT`).
3. Rate limits: 500 req/15min per IP on `/api`; 10 req/15min on login.
4. Route-level auth + workspace role verification.
5. Central error handler returns `{ error, code }` and logs with request ID.

## Conventions
- Canonical data (amounts, dates, codes) is stored raw; Persian display formatting happens only at the view layer (`src/utils/formatters.ts`, `src/lib/persianDate.ts`).
- All financial mutations that can be retried should send `Idempotency-Key`.
