# TaxBook — Modernization Report (Phase 1)

Implements the "Immediate (Phase 1) decisions" from `docs/modernization-plan.md`. Later phases remain planned there.

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
- `useSWR` → TanStack Query migration (Phase 3).
- `loadRecordForUser` helper to deduplicate tenant checks; `workspace_id || 1` fallback tightening (Phase 5).
- Error envelope v2 under `/api/v1`; OpenAPI typegen (Phases 5/7).
- Refresh-token rotation, account lockout, CSP, multer 2.x, Argon2id evaluation (Phase 8).
- FTS5 rebuild gating on startup; composite-index EXPLAIN verification (D1/D3).
- Playwright E2E suite (Phase 10).
