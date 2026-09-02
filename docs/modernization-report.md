# TaxBook — Modernization Report (Phase 1)

Implements the "Immediate (Phase 1) decisions" from `docs/modernization-plan.md`. Sessions 2–6 below record each subsequent increment. Later phases remain planned.

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
| `cd server && npm test` | PASS 48 passed |
| `npm test` (frontend) | PASS 76 passed, 11 files |
| `npm run build` | PASS built |
| `npm run lint` | pre-existing project-wide warnings unchanged; no new errors from touched files |
| Playwright E2E / Docker build | later phases / CI |

---

## Session 2 — Phase 3 (server state) & Phase 5 (tenancy) increments

**Dependencies**
- Added: `@tanstack/react-query` ^5.102.8 (the only new dependency; no Zustand yet — no client/UI state needs it).

**Server state (Phase 3)**
- `src/hooks/useSWR.ts` reimplemented on top of TanStack Query (`QueryClient` singleton + `QueryObserver` via `useSyncExternalStore`), preserving the exact public API (`useSWR`, `useSWRMutation`, `invalidateCache`) so all existing callers migrated transparently with zero code changes.
- Semantics preserved: no retries (`retry: false`), 30s staleTime, optional refetch interval, optimistic `mutate` with functional updates, error surface as before. `null` results normalized to `undefined`.
- New regression tests: `src/__tests__/useSWR.test.tsx` (9 tests).

**Backend tenancy (Phase 5)**
- New `server/lib/authz.js`: `getWorkspaceRole`, `assertWorkspaceRole`, `loadRecordForUser(recordId, userId, minRole)`, `resolveWorkspaceId(req)`.
- `records.js`: POST /, PUT /:id and /import-url use the shared helpers; the `workspace_id || 1` silent fallback replaced by `resolveWorkspaceId` (explicit → single membership → legacy ws-1-if-member → 400 `MISSING_WORKSPACE`).
- `GET /api/records` limit hard cap reduced from 10,000 → 1,000 (bounded payloads, audit A2).

**Database (D1)**
- FTS5 rebuild on startup gated by `isFTS5Healthy()` (table exists + triggers exist + row counts match).

**Test results**: Backend 48/48, Frontend 85/85 (11 files), Build OK.

---

## Session 3 — Phase 8 (lockout), Phase 10 (E2E), D3 (indexes), IDOR fix

**Security (Phase 8)**
- Per-account brute-force lockout (audit S7): migration `005_auth_lockout.cjs` adds `users.failed_login_attempts` / `users.locked_until`; 5 failed logins → 15-minute lock returning `429 ACCOUNT_LOCKED`; successful login resets; no user enumeration. The standalone E2E server skips the IP login limiter (`E2E_LISTEN=1`) so lockout is tested deterministically.

**IDOR fix (found by the new E2E suite)**
- `GET /api/records`, `/api/records/all`, and `/api/records/trash` returned a workspace's records to **any authenticated user** who knew the workspace id, without verifying requester membership. Now non-members get an empty view. Regression tests added at both API-E2E and unit (Supertest) level.

**Database (D3)**
- Migration `006_composite_indexes.cjs`: `records(workspace_id, deleted_at, created_at)` and `records(workspace_id, code)`.
- Evidence (`server/explain-check.mjs`, kept as a tool): records-list query went from index search + `USE TEMP B-TREE FOR ORDER BY` → pure index search with no sort step; duplicate-code checks now use a covering index.

**Testing (Phase 10)**
- Playwright E2E scaffolding: `playwright.config.ts` (starts a real server on :3110 with isolated SQLite DB via `DB_PATH`, `NODE_ENV=test`, `E2E_LISTEN=1`) and `e2e/api/` suites. `npm run test:e2e` added; CI runs the E2E suite.
- Backend unit tests grew from 48 → 54. Login-lockout unit coverage lives in E2E because the unit suite shares one IP rate-limit budget.

**Test results**: Backend 54/54, E2E 9/9, Frontend 85/85, Build OK.

---

## Session 4 — Phase 7 (typegen), Phase 8 (CSP), dependency cleanup

**Security (Phase 8)**
- Report-only Content-Security-Policy via Helmet (audit S6, staged): strict directives with `reportOnly: true` so nothing breaks; flip to enforcing after monitoring violation reports.

**API contract (Phase 7, audit A4)**
- `scripts/generate-api-types.mjs` + `npm run generate:api-types`: converts the backend OpenAPI spec into `src/types/api-generated.d.ts` (7 schema interfaces + a `components` registry). Dependency-free on purpose — `openapi-typescript` requires TypeScript ^5 while the project is on TS 6.
- The generated file is committed so CI needs no extra step.

**Dependencies**
- Removed from the server: `multer` 1.x (maintenance mode, audit Dep3) and `sharp` — zero import sites confirmed by search (artifact handling is streamed, not buffered). Dockerfile build-tools comment updated (only better-sqlite3 needs compilation now).
- Lockfile hygiene: all `mirror.abrha.net` tarball URLs in both lockfiles migrated to `registry.npmjs.org` — the mirror was intermittently unreachable and would break CI's `npm ci`.

**Test results**: Backend 54/54, E2E 9/9, Frontend 85/85, Build OK.

---

## Session 5 — Phase 8: refresh-token rotation & revocation

**Backend**
- Migration `007_refresh_tokens.cjs`: `refresh_tokens` table (SHA-256 hash, expiry, revocation, user agent, FK cascade).
- `server/lib/refresh-tokens.js`: `issueRefreshToken`, `rotateRefreshToken` (single-use rotation; **reuse of a rotated token revokes all of the user's sessions** — theft detection), `revokeRefreshToken`.
- `routes/auth.js`: login/register now also issue a refresh token; new `POST /api/auth/refresh` and `POST /api/auth/logout` endpoints. Invalid/expired/reused → 401 `INVALID_REFRESH_TOKEN`.

**Frontend**
- `src/utils/api.ts`: silent single-flight refresh on 401 with one automatic retry of the original request; `api.logout()` revokes the server session; `clearAuthStorage()` centralizes session teardown. `LoginPage` persists the refresh token; `useWorkspace.handleLogout` now revokes server-side.

**Tests**
- New `src/__tests__/api-auth.test.ts` (5 unit tests, mocked fetch): refresh-and-retry carrying the new token, failure clears storage + `auth-change`, no refresh without a stored token, logout revocation, storage teardown.
- New E2E cases in `e2e/api/auth.spec.ts`: rotation issues new pair + reuse rejected (401 `INVALID_REFRESH_TOKEN`) + replay triggers theft detection; logout revocation. E2E suite now 11 tests.

**Test results**: Backend 54/54, E2E 11/11, Frontend 90/90 (13 files), Build OK.

---

## Session 6 — v1 error envelope, WS hardening, refresh-token purging

**API (Phase 5, audit A1)**
- Error envelope v2 under `/api/v1` only: `{ "error": { code, message, requestId } }` (central error handler + 404 handler). Legacy `/api` keeps the flat `{ error, code }` shape — zero client impact. Unit-tested for both shapes.

**Bug fix (found by the new envelope tests)**
- The SPA fallback `app.get('*')` swallowed unmatched `GET /api/*` requests without responding — they hung until client timeout. Now they call `next()` and reach the 404 handler.

**WebSocket hardening (audit #28)**
- `join-workspace` rejects malformed workspace ids (must be a positive integer) before the membership check; JWT secret now sourced from the validated config module instead of a duplicated env check. Handshake auth and membership-gated room joins were verified as already correct.

**Housekeeping**
- Daily purge of expired refresh tokens (and revoked ones after 7 days, kept briefly so theft detection still fires); timer cleared on graceful shutdown.

**Test results (quality gate)**
- Backend: 57/57 ✅ · E2E: 11/11 ✅ · Frontend: 90/90 ✅ · Build: ✅

---

## Remaining technical debt
- `App.tsx` (72 KB) feature extraction (Phase 2).
- Argon2id evaluation; CSP enforcement flip after monitoring report-only violations; browser-level UI E2E (offline mode, WebSocket reconnect).

