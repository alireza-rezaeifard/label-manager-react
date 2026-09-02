# TaxBook — Modernization Plan

Companion to `docs/architecture-audit.md`. This document is the implementation contract: what changes, in what order, and why.

## 1. Current stack
React 19 + Vite 8 + TypeScript + Tailwind 4 (frontend) · Express 4 + better-sqlite3 (WAL, FTS5) + Socket.IO + JWT + Pino + Swagger (backend) · Docker Compose with nginx frontend, hermes agent, backend.

## 2. Current architecture
- Backend: modular route files + central error handler + role middleware + migration system + backup/recovery. `index.js` remains the composition root (979 lines).
- Frontend: single large `App.tsx` shell (~2000 lines) with lazy-loaded pages, custom `useSWR` server-state layer, hook-based domain logic, localStorage-backed workspace state for offline.

## 3. Frontend problems
1. `App.tsx` monolith (F1) — split into `src/features/*` gradually.
2. Hand-rolled server-state cache (F2) — migrate to TanStack Query hook-by-hook.
3. No explicit vendor chunking (F6) — add `manualChunks`.
4. Formatting logic duplication (F5) — consolidate into `src/utils/format.ts`.

## 4. Backend problems
1. Per-route duplication of workspace membership checks (I1) — introduce `loadRecordForUser(minRole)` helper.
2. `workspace_id || 1` silent fallback (I2) — require explicit workspace.
3. Flat error envelope (A1) — target `{ error: { code, message, details } }` for `/api/v1`.
4. Unbounded list cap of 10,000 (A2) — default 200, hard cap 1,000.

## 5. Database problems
1. Non-idempotent seeding (D2) — `INSERT OR IGNORE` + re-select.
2. FTS5 rebuild every boot (D1) — gate on marker.
3. Indexes to verify with EXPLAIN QUERY PLAN before adding (D3).

## 6. Security problems
S1–S8 in audit. Phase 1 fixes: env validation, configurable JWT TTL, request IDs, idempotency for financial writes. Phase 8: refresh rotation, per-account lockout, CSP, Argon2id evaluation, multer upgrade.

## 7. Performance problems
P1–P3 in audit. Targets: p95 list endpoints < 100 ms on 100k records (SQLite), initial JS < 300 KB gzipped, no unbounded payloads.

## 8. Dependency problems
Dep1–Dep3 in audit. No blind upgrades; removal only with zero import sites confirmed by search.

## 9. Recommended stack
Keep: React 19, Vite, Tailwind 4, Radix/Base UI, Express, SQLite (now), Pino, Helmet, Socket.IO, Vitest.
Add incrementally: TanStack Query (Phase 3), Zustand for UI state (Phase 3), TanStack Table (Phase 4), Playwright (Phase 10).
Future (evidence-gated): PostgreSQL + Drizzle (Phase 6), Redis + BullMQ (Phase 9), OpenAPI typegen (Phase 7).
Do **not** add: MUI/AntD/Chakra, a second ORM, a second state library for server data.

## 10. Migration order
See audit §3 (phases 0–10). Each phase must leave `npm run lint`, `npm test`, `npm run build`, and backend tests green.

## 11. Risks
| Risk | Mitigation |
|---|---|
| Business calculation regression (amounts, numbering, Jalali dates) | Regression tests **before** touching any calculation; Phase 0 rule #46 |
| Offline/localStorage behavior regression | Keep `useWorkspaceData` untouched until Phase 3 has explicit offline story |
| API consumers depending on flat error shape | New envelope only under `/api/v1` with flag |
| TanStack Query migration breaking WebSocket invalidation | Migrate hook-by-hook; keep `useSWR` shim until all callers moved |
| Docker image changes breaking deploy | Health checks + compose smoke test in CI |

## 12. Expected benefits
- Deterministic CI (green tests, lint, build) from Phase 1 onward.
- Duplicate financial record creation eliminated via idempotency keys.
- Fail-fast production configuration; shorter token lifetime.
- Smaller initial JS via vendor chunking.
- A written, evidence-based roadmap that gates heavier work (Postgres/Redis) behind actual deployment needs.
