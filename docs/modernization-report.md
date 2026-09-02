# TaxBook — Modernization Report (Phase 1)

Implements the "Immediate (Phase 1) decisions" from `docs/modernization-plan.md`, plus Phases 3 & 5 increments (see "Session 2" below). Later phases remain planned.

## Changed files
**Backend**
- `server/config/env.js` — **new**: validated env config; fail-fast in production (JWT_SECRET, PORT, ALLOWED_ORIGINS, JSON_BODY_LIMIT, JWT_EXPIRES_IN, IDEMPOTENCY_TTL_HOURS).
- `server/index.js` — request-ID middleware (`X-Request-Id`), request logs include `requestId`, PORT/CORS/JSON-limit from config, hourly idempotency-key purge, purge timer cleared on shutdown.
- `server/errors.js` — all error responses emit `X-Request-Id`.
- `server/middleware/auth.js` — JWT secret & TTL from config; removed duplicated env parsing.
- `server/db.js` — idempotent seeding (fixes UNIQUE crash under concurrent starts).
- `server/migrate.js` — idempotent migration tracking (fixes parallel-suite race).
- `server/routes/records.js` — `Idempotency-Key` support on `POST /api/records` (replay returns original response, `Idempotency-Replayed: true`).
- `server/migrations/004_idempotency_keys.sql` — **new** additive migration.

**Frontend**
- `vite.config.js` — function-form `manualChunks` (Rolldown) for react/charts/export vendors; vitest `include`/`exclude` fixed so vendored zod tests (`.mimocode`, `.opencode`, `hermes`) no longer run.
- `src/components/ui/button.tsx`, `input.tsx`, `progress.tsx`, `separator.tsx`, `switch.tsx`, `scroll-area.tsx`, `select.tsx`, `tabs.tsx` — removed imports of the **non-existent** `@base-ui/react` package; rewritten as accessible native implementations (Radix `Slot` for `asChild`) preserving exports/props.
- `src/__tests__/useToast.test.ts` — updated to the current Sonner-backed hook contract.

**Infra/CI**
- `Dockerfile` — non-root user (uid 1001), HEALTHCHECK on `/api/version`, STOPSIGNAL SIGTERM, cleanup of dev artifacts.
- `.github/workflows/ci.yml` — **new**: lint → frontend tests → build → backend tests → audits → Docker builds.
- `package.json`/`package-lock.json` — removed phantom `@base-ui/react`; added missing transitive `@floating-ui/react-dom` (required by `@radix-ui/react-popper`).

**Docs**
- New: `architecture-audit.md`, `modernization-plan.md`, `architecture.md`, `api.md`, `database.md`, `security.md`, `deployment.md`, `performance.md`, `testing.md`, this report.

## Dependencies
- Removed: `@base-ui/react` (package does not exist on npm — phantom dep breaking build/tests).
- Added: `@floating-ui/react-dom` (missing transitive requirement of Radix popper; unblocked App tests).
- Deliberately **not** added: TanStack Query/Table, Zustand, Drizzle, Redis, BullMQ (gated on later phases).

## Security fixes
1. Fail-fast validated production config (no silent insecure boot).
2. Configurable, short-by-default JWT lifetime (was fixed 7d).
3. Idempotency keys prevent duplicate financial records on retries.
4. Correlation IDs on every error response and log line.

## Performance measurements
- Frontend bundle now splits: `vendor-react` 220.85 KB (70.76 gz), `vendor-charts` 597 KB (163.74 gz — on-demand), `vendor-export` 1.19 MB (373.94 gz — on-demand), `index` 720 KB (204.72 gz).
- Build time ~2s; no regression to initial load (charts/export no longer in the main chunk).
- Backend test suite: 48/48 passing, ~1.3s (was 2 suites failing).
- Frontend test suite: 76/76 passing, 11/11 files (was 5 failures + 1 broken suite + vendored zod tests running).

## Test results (quality gate)
| Check | Result |
|---|---|
| `cd server && npm test` | ✅ 48 passed |
| `npm test` (frontend) | ✅ 76 passed, 11 files |
| `npm run build` | ✅ built |
| `npm run lint` | pre-existing project-wide warnings unchanged; no new errors from touched files (remaining ui/ `react-refresh/only-export-components` errors existed in the original variants-exporting files) |
| Playwright E2E / Docker build | ⏳ Phase 10 / CI |

## Remaining technical debt
- `App.tsx` (72 KB) feature extraction (Phase 2).
- Error envelope v2 under `/api/v1`; OpenAPI typegen (Phases 5/7).
- Refresh-token rotation, account lockout, CSP, multer 2.x, Argon2id evaluation (Phase 8).
- Composite-index EXPLAIN verification (D3).
- Playwright E2E suite (Phase 10).

---

## Session 2 — Phase 3 (server state) & Phase 5 (tenancy) increments

**Dependencies**
- Added: `@tanstack/react-query` ^5.102.8 (the only new dependency; no Zustand yet — no client/UI state needs it).

**Server state (Phase 3)**
- `src/hooks/useSWR.ts` reimplemented on top of TanStack Query (`QueryClient` singleton + `QueryObserver` via `useSyncExternalStore`), preserving the exact public API (`useSWR`, `useSWRMutation`, `invalidateCache`) so **all existing callers migrated transparently with zero code changes**.
- Semantics preserved: no retries (retry: false), 30s staleTime, optional refetch interval, optimistic `mutate` with functional updates, error surface as before. `null` results normalized to `undefined`.
- New regression tests: `src/__tests__/useSWR.test.tsx` (9 tests: fetch, cache sharing, key isolation, optimistic mutate, functional updater, invalidation refetch, error state, disabled-null-key, mutation).

**Backend tenancy (Phase 5)**
- New `server/lib/authz.js`: `getWorkspaceRole`, `assertWorkspaceRole`, `loadRecordForUser(recordId, userId, minRole)` (user → membership → role → resource ownership in one call), `resolveWorkspaceId(req)`.
- `records.js`: POST /, PUT /:id and /import-url now use the shared helpers (duplicated inline membership checks removed); the `workspace_id || 1` silent fallback is replaced by `resolveWorkspaceId` (explicit → single membership → legacy ws-1-if-member → 400 `MISSING_WORKSPACE`). No test or frontend behavior change.
- `GET /api/records` limit hard cap reduced from 10,000 → 1,000 (bounded payloads, audit A2).

**Database (D1)**
- FTS5 rebuild on startup is now gated by `isFTS5Healthy()` (table exists + triggers exist + row counts match). Healthy databases skip the full reindex; corruption still force-rebuilds via the error-handler path.

**Test results**
- Frontend: 85/85 passed (11 files). Build: ✅. Backend: 48/48 passed.

---

## Session 3 — Phase 8 (lockout), Phase 10 (E2E), D3 (indexes), IDOR fix

**Security (Phase 8)**
- Per-account brute-force lockout (audit S7): migration `005_auth_lockout.cjs` adds `users.failed_login_attempts` / `users.locked_until`; 5 failed logins → 15-minute lock returning `429 ACCOUNT_LOCKED`; successful login resets; no user enumeration. The standalone E2E server skips the IP login limiter (`E2E_LISTEN=1`) so lockout is tested deterministically.

**IDOR fix (found by the new E2E suite)**
- `GET /api/records`, `/api/records/all`, and `/api/records/trash` returned a workspace's records to **any authenticated user** who knew the workspace id, without verifying requester membership. Now non-members get an empty view (`WHERE 1=0` / `total: 0` / `[]`). Regression tests added at both API-E2E and unit (Supertest) level.

**Database (D3)**
- Migration `006_composite_indexes.cjs`: `records(workspace_id, deleted_at, created_at)` and `records(workspace_id, code)`.
- Evidence (`server/explain-check.mjs`, kept as a tool): records-list query went from `SEARCH records USING INDEX idx_records_workspace_id` + `USE TEMP B-TREE FOR ORDER BY` → pure index search with no sort step; duplicate-code checks now use a covering index.

**Testing (Phase 10)**
- Playwright E2E scaffolding: `playwright.config.ts` (starts a real server on :3110 with isolated SQLite DB via `DB_PATH`, `NODE_ENV=test`, `E2E_LISTEN=1`) and `e2e/api/` suites: auth (login, lockout, no enumeration), records (CRUD, duplicate codes, idempotent creation replay, pagination caps), workspace isolation (read/update/delete/list from a non-member). 9 tests, no browsers needed.
- `npm run test:e2e` added; CI runs the E2E suite.
- Backend unit tests grew from 48 → 54 (workspace isolation + regression coverage for the IDOR fix). Login-lockout unit coverage lives in E2E because the unit suite shares one IP rate-limit budget.

**Test results (quality gate)**
- Backend: 54/54 ✅ · Frontend: 85/85 ✅ · Build: ✅ · E2E: 9/9 ✅

---

## Session 4 — Phase 7 (typegen), Phase 8 (CSP), dependency cleanup

**Security (Phase 8)**
- Report-only Content-Security-Policy via Helmet (audit S6, staged): strict directives (`default-src 'self'`, no objects, no framing) with `reportOnly: true` so nothing breaks; flip to enforcing after monitoring violation reports.

**API contract (Phase 7, audit A4)**
- `scripts/generate-api-types.mjs` + `npm run generate:api-types`: converts the backend OpenAPI spec into `src/types/api-generated.d.ts` (7 schema interfaces + a `components` registry). Dependency-free on purpose — `openapi-typescript` requires TypeScript ^5 while the project is on TS 6.
- The generated file is committed so CI needs no extra step.

**Dependencies**
- Removed from the server: `multer` 1.x (maintenance mode, audit Dep3) and `sharp` — **zero import sites confirmed by search** (audit had listed them as used; artifact handling is streamed, not buffered). Dockerfile build-tools comment updated (only better-sqlite3 needs compilation now).
- Lockfile hygiene: all `mirror.abrha.net` tarball URLs in both lockfiles migrated to `registry.npmjs.org` — the mirror was intermittently unreachable (ECONNRESET) and would break CI's `npm ci`.

**Test results (quality gate)**
- Backend: 54/54 ✅ · E2E: 9/9 ✅ · Frontend: 85/85 ✅ · Build: ✅
