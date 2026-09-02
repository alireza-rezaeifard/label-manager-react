# TaxBook (label-manager-react) — Architecture Audit

> Phase 0 audit. Scope: full repository on branch `taxbook-v2`, commit `ca7039d`.
> No production behavior was modified during this audit phase.

## 1. Current Architecture

### Domain note
The application is a **Persian financial record manager** ("Label Studio" codebase being rebranded to TaxBook).
The financial entities are **records** (code, project, type, date, party, amount, tags, related, image),
organized into **workspaces** with **RBAC** (owner / admin / editor / viewer). There are no separate
"invoice / customer / product" entities; records *are* the financial documents. Modernization items that
reference invoices/customers/products map onto records / party (record field) / project (record field).

### Stack
| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS 4, Radix UI, Base UI, Framer Motion, Sonner, react-window, ApexCharts, Socket.IO client, papaparse, xlsx, jspdf/html2canvas, qrcode/jsqr |
| State | Custom hooks (`useSWR.ts` cache layer, `useRecords`, `useWorkspace`, `useWorkspaceData` with localStorage persistence), one `AppContext` |
| Backend | Node 20 (Docker), Express 4, better-sqlite3 (WAL), JWT (jsonwebtoken), bcryptjs, multer+sharp (artifacts), Helmet, express-rate-limit, Pino, Socket.IO, swagger-jsdoc/ui |
| DB | SQLite with WAL, FTS5 search, schema-versioned migrations (SQL + .cjs), automatic corruption recovery + pre-start backups |
| Deploy | docker-compose (backend + hermes agent + nginx frontend), two Dockerfiles, nginx.conf |

### Structure
- `server/index.js` (979 lines): app assembly, CORS/Helmet/rate limits, request logging, swagger registration, static SPA fallback, graceful shutdown, WAL checkpointing.
- `server/routes/*`: auth, records, workspaces, custom-fields, api-keys, webhooks, notifications, ai, artifacts — flat route+handler files.
- `server/db.js`: connection, integrity check, auto-recovery, FTS5 build/rebuild, default admin + workspace seeding.
- `server/middleware/auth.js`: JWT verification, workspace role hierarchy, record-scoped role check.
- `server/errors.js`: `AppError`, central error handler incl. FTS5 corruption self-healing, `asyncHandler`.
- Frontend: `src/App.tsx` is a 72 KB single-file "app shell + all pages" component; pages are lazy-loaded already; panels/components under `src/components`; domain logic in `src/hooks` and `src/lib`.

## 2. Findings

Severity: 🔴 critical · 🟠 high · 🟡 medium · 🔵 low.

### Security
| # | Severity | Finding | Recommended solution |
|---|---|---|---|
| S1 | 🟠 | JWT lifetime hardcoded to 7d, not configurable; no refresh/rotation | Make TTL configurable (`JWT_EXPIRES_IN`), short-lived tokens; refresh-token flow as Phase 8 item |
| S2 | 🟠 | `JWT_SECRET` checked only inside `middleware/auth.js` at import time; no length policy | Central validated env config, fail fast in production |
| S3 | 🟠 | No idempotency for record creation — a retried POST after network failure can create duplicate financial records (partially mitigated by `DUPLICATE_CODE`) | `Idempotency-Key` header support on POST /records with persisted keys |
| S4 | 🟡 | Default admin password `admin123` seeded silently | Keep for dev; forbid in production unless explicitly allowed |
| S5 | 🟡 | `express.json` limit 10mb for all routes | Make configurable; per-route limits for heavy import endpoints |
| S6 | 🟡 | CSP disabled in Helmet (`contentSecurityPolicy: false`) | Introduce nonce-based CSP or at minimum report-only CSP |
| S7 | 🔵 | Login rate limit exists (10/15min) — good. Per-account lockout missing | Track failed attempts per username |
| S8 | 🔵 | No per-request correlation IDs in logs/responses | Request-ID middleware |

### Tenant isolation / authorization
- **Positive:** workspace role middleware exists (`requireWorkspaceRole`, `requireRecordWorkspaceRole`) and records routes verify membership inline for create/update/delete.
- I1 🟠 The membership+role check is *duplicated manually per route*; easy to forget in a new route. Recommend a single `loadRecordForUser(minRole)` helper (Phase 5).

### Database
- **Positive:** WAL mode, FK pragma on, FTS5 with triggers, migrations tracked, indexes migration (002) exists, integrity-check + auto-recovery, pre-start backups, periodic WAL checkpointing.
- D1 🟡 `rebuildFTS5()` runs on **every startup** regardless of need — slow startup with large datasets. Gate on integrity/version marker.
- D2 🟠 Default admin/workspace seeding is not idempotent under concurrent processes (UNIQUE crash observed in tests running parallel suites) — must use `INSERT OR IGNORE`.
- D3 🔵 No covering indexes verified with EXPLAIN QUERY PLAN; recommended composite indexes around `(workspace_id, deleted_at, created_at)`, `(workspace_id, code)`.
- D4 🔵 SQLite is appropriate for the current single-node/offline product; PostgreSQL+Drizzle remains a Phase 6 *future* item (no evidence of multi-node deployment yet).

### API
- A1 🟡 Error envelope is flat (`{ error, code }`) not nested (`{ error: { code, message } }`); consistent but non-standard. Standardize behind `/api/v1` in Phase 5.
- A2 🟡 Records list caps limit at 10,000 rows in one response — effectively unbounded payloads. Enforce ≤ 200 default + pagination.
- A3 🔵 Dual route trees (`/api` and `/api/v1`) double the swagger surface; keep, but document `/api` as legacy alias.
- A4 🔵 Swagger exists but is not published as a typed contract for frontend type generation (Phase 7 item).

### Frontend
- F1 🟠 `src/App.tsx` (72 KB, ~2000 lines) mixes app shell, routing, per-tab state, keyboard shortcuts, print/export orchestration. Needs feature-based extraction (Phase 2).
- F2 🟠 Custom `useSWR` cache hand-rolls server state (no retries, no mutation invalidation graph). TanStack Query is the target replacement (Phase 3).
- F3 🟡 Dead artifacts in tree: `TaxBookExportModal.tsx.tFcgf7rS.tmp`, `--clip*` files in repo root.
- F4 🟡 Test discovery picks up vendored zod tests from `.mimocode`, `.opencode`, `hermes/node_modules` (vitest `exclude` too narrow).
- F5 🔵 Formatting logic split across `src/utils/formatters.ts`, `persianDate.ts` and inline component code — consolidate.
- F6 🔵 Bundle: apexcharts/jspdf/html2canvas/xlsx are heavy; lazy-imported in some paths but no explicit vendor chunking → large single chunks.

### Performance
- P1 🟡 Records list default limit 200 with offset pagination — fine at current scale; virtualization already used in lists.
- P2 🔵 FTS5 rebuild on boot (D1) is the biggest startup cost candidate.
- P3 🔵 No cache-header differentiation for hashed static assets (nginx serves frontend; backend also serves `dist` when present).

### Dependencies
- Dep1 🟡 `indent-string`, `strip-indent` in root runtime deps with no runtime import sites found; chat-only libs (`react-markdown`, `remark-gfm`, `react-syntax-highlighter`) should be lazy-chunked or removed after a usage audit.
- Dep2 🔵 `pino`/`pino-http` in root deps though logging is server-side only (server has its own package.json).
- Dep3 🔵 multer 1.x is in maintenance mode — upgrade to multer 2.x in the security phase.

### Testing
- T1 🟠 Backend test suites currently fail due to D2 (parallel seeding race) — fix first, it blocks CI.
- T2 🟡 No CI pipeline. No typecheck script. No E2E (Playwright used via MCP only).
- T3 🔵 Frontend tests pass but with noisy `act()` warnings and vendored test discovery (F4).

## 3. Migration Strategy

| Phase | Scope | Risk | Notes |
|---|---|---|---|
| 0 | This audit | none | done |
| 1 | Stability & testability: fix seeding race, vitest scoping, request IDs, env config validation, idempotency, Docker/CI | low | no behavior change for clients |
| 2 | Frontend feature architecture: split App.tsx into features/ | medium | pure refactor, tests + build gate |
| 3 | Server state: replace useSWR with TanStack Query incrementally per hook | medium | keep useSWR shim during migration |
| 4 | Design system consolidation (tokens, tables, forms, RTL audit) | medium | visual regression risk |
| 5 | Backend modularization: loadRecordForUser helper, error envelope v2, pagination caps | medium | API contract change behind /api/v1 |
| 6 | PostgreSQL + Drizzle (only if multi-node SaaS required) | high | keep SQLite for offline |
| 7 | OpenAPI → generated TS types | low | after 5 |
| 8 | Auth hardening: refresh rotation, lockout, CSP, Argon2id evaluation | medium | |
| 9 | Redis + BullMQ (only when job volume justifies) | medium | not now — single-node |
| 10 | Playwright E2E: login, workspace isolation, record CRUD, import/export, offline | low | |

## 4. Immediate (Phase 1) decisions
- Keep SQLite, Express 4, Helmet, rate limits, FTS5, migrations, backup/recovery, Socket.IO design.
- Fix: D2 (test race), F4 (vitest scope), S1/S2 (env config + JWT TTL), S3 (idempotency), S8 (request IDs), F6 (vendor chunks), T1/T2 (CI).
- No breaking schema changes; migration `004_idempotency_keys.sql` is additive.

