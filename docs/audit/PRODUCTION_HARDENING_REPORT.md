# Production Hardening Report

Follow-up to the audit at `7a08347` (status: READY WITH WARNINGS).
Branch: `taxbook-v2` · Date: 2026-09-20 · Nothing committed (working tree only).

Planned changes were stated before any file was modified. Guiding rule:
type-only, fail-closed, or crash-guard changes; no business-logic rewrites,
no new runtime dependencies, no lockfile mutations.

## H1 — JWT algorithm confusion

* Severity: MEDIUM
* Current state: `server/middleware/auth.js` signed and verified JWTs without
  pinning `alg`. Only an HS256 secret is ever configured, so exploitability
  was theoretical, but verification honored whatever `alg` a token presented.
* Fix applied: `generateToken` signs with `algorithm: 'HS256'`;
  `authMiddleware` verifies with `algorithms: ['HS256']`.
* Verification: server suite 60/60, e2e auth/refresh/logout 7/7, UI smoke 1/1.

## H2 — Password change left other sessions alive

* Severity: MEDIUM
* Current state: `POST /auth/change-password` rotated nothing; stolen refresh
  tokens stayed usable after the victim changed their password.
* Fix applied: new `revokeAllUserRefreshTokens(userId)` in
  `server/lib/refresh-tokens.js`, called on password change. Already-issued
  access tokens still expire on their own; no new ones can be minted.
* Verification: new `server/__tests__/auth-hardening.test.js` proves
  original + rotated refresh tokens 401 after the change and that login with
  the new password works. Server suite 60/60.

## H3 — No username policy on register

* Severity: LOW
* Current state: any non-empty username accepted (1-char, blank-ish,
  unbounded length → log/DB noise, enumeration-shaped accounts).
* Fix applied: `validateUsername` (3–64 chars, non-blank) on
  `POST /auth/register`; login path untouched (must accept what exists).
* Verification: 2 new tests (short + blank → 400); all pre-existing
  register/login tests use longer names and pass. Server 60/60.

## H4 — localStorage token storage / HttpOnly-cookie migration

* Severity: HIGH (residual risk, NOT migrated — see verdict)
* Current state: access + rotating refresh tokens and third-party LLM keys
  live in cleartext `localStorage` (XSS-exfiltable). Mitigations in place:
  12h access, single-use rotating refresh (SHA-256 at rest) with reuse
  theft-detection that kills all sessions, no `dangerouslySetInnerHTML`.
* Fix applied: none (deliberate). A cookie migration is a coordinated,
  multi-surface change, unsafe as a drive-by: synchronous `localStorage`
  reads in `api.ts`/`AppContext`, socket.io `auth: { token }` handshake,
  dual API-key auth, local-mode fallback, plus required CORS
  `credentials:true` and new CSRF protection (SameSite + token/header).
* Verification/recommendation: concrete migration plan recorded here —
  (1) server sets `__Host-` prefixed HttpOnly/Secure/SameSite=Lax cookies
  on login/refresh, middleware reads cookies first, (2) frontend drops
  `Authorization` sends for same-origin `/api`, socket uses cookie auth,
  (3) add CSRF token for cookie-authenticated mutations, (4) keep
  `Authorization` Bearer as fallback for API-key clients, (5) cover with
  the existing e2e auth spec + new cookie assertions. Do this as its own
  PR with a dual-write transition period.

## H5 — Predictable bootstrap admin in production

* Severity: HIGH
* Current state: `ADMIN_PASSWORD` defaulted to `admin123` everywhere and
  `docker-compose.yml` never passed it through — every fresh prod deploy
  seeded a well-known admin.
* Fix applied: `server/config/env.js` fails fast in production when
  `ADMIN_PASSWORD` is unset (same precedent as `JWT_SECRET`); dev/test keep
  the default. `server/db.js` now seeds from central `config` instead of
  reading `process.env` directly. Compose passes
  `ADMIN_USERNAME` (default `admin`) and requires `ADMIN_PASSWORD`
  (`...?Please set...`); `.env.example` documents the requirement.
* Verification: live boot test — production boot without `ADMIN_PASSWORD`
  exits 1 with `ADMIN_PASSWORD is required in production`; with it set,
  boot proceeds past validation into migrations. Server/e2e suites
  (`NODE_ENV=test`) unaffected, 60/60 + 12/12.

## H6 — Secrets in source control

* Severity: — (verification only)
* Current state: `git ls-files` shows only `*.env.example` (placeholders);
  regex scan for `sk-…`, private keys, `ghp_`, `AKIA` across
  `src/ server/ hermes/ e2e/` finds nothing. Previous-pass `.gitignore`
  (`.env.*`, uploads, `hermes/dist/`) confirmed effective.
* Fix applied: none needed.
* Verification: scan output recorded above; `git status` shows no secret files.

## H7 — Hermes open CORS

* Severity: HIGH (conditional on exposure)
* Current state: `hermes/src/index.ts` used `cors()` allow-all while exposing
  ~40 file/shell/git/db tools. Safe only on the private compose network
  (port unpublished); the browser never calls Hermes directly (verified: no
  `:3002`/direct calls in `src/`, all traffic via `/api/ai`).
* Fix applied: default-deny allowlist from `HERMES_ALLOWED_ORIGINS`
  (local dev origins by default), documented in `hermes/.env.example`.
  `0.0.0.0` bind kept (required inside the container).
* Verification: live boot — `/health` ok; evil-origin POST rejected (no
  ACAO headers); `http://localhost:3000` preflight → 204 + ACAO echo.
  `tsc --noEmit` in `hermes/` clean.

## H8 — TypeScript debt (130 error lines → 1 pre-existing design error)

* Severity: MEDIUM (tech debt, not a build blocker — vite/CI don't gate on tsc)
* Current state: 56 entries across 15 files.
* Fix applied (all type-only or crash-guard, zero intended runtime change):
  missing `isAuthenticated` import in `useWorkspaceData` — a genuine
  ReferenceError on every `auth-change` event (thrown by
  `clearAuthStorage` on each auth failure); missing
  `onAddTemplateCustomFields` in `FormPanel` destructuring — ReferenceError
  on invoice-template click; honest alignments (`CustomField.fieldType?` /
  `workspace_id?`, `FilterState.selectedTagFilter: string | null`,
  `Sidebar` → `ActivityLogEntry`, `api.createRecord`/`renumberRecords`
  signatures, `LoginPage.onLogin: AuthUser | null`, `SelectContext`
  default, ApexCharts handler types, `setShowTemplates`/`onSetViewMode`/
  `onSetPage`/`onSetUseVirtualScroll`/`onSetEnabledCustomFieldKeys` widened
  to the real `Dispatch<SetStateAction<…>>` flowing through `ListPanel`);
  crash-guards (`?.()` on the restore-timeout ref and socket refs,
  `pendingRestore` null guard, `String()` coercion in `ViewDetail`,
  boundary normalization + `RecordItem` annotation in `ImportCSV`,
  legacy `{name}` tool-call normalizer for old stored chat sessions,
  read-site assertions where miss-behavior is already handled).
* Verification: `tsc --noEmit` 130 lines → 5 lines (1 remaining error, H9);
  eslint 0 errors (48→47 warnings); frontend 103/103; server 60/60;
  build ok; e2e 12/12.

## H9 — Remaining tsc error (intentionally left)

* Severity: LOW
* Current state: `App.tsx(1218)` — `CustomField[]` vs SettingsTab's local
  `CustomFieldSettings[]` (required `fieldType`). Unifying them changes
  SettingsTab rendering/editing behavior (it reads `fieldType` for badges
  and editors while producers write `type`).
* Fix applied: none — needs a product decision (canonical field-shape
  migration), not a hardening drive-by. Related drifts documented:
  `RecordItem.id` string-vs-number, `chatStore` tool-result id matching.

## H10 — Dependencies / xlsx

* Severity: HIGH (advisory)
* Current state: `npm audit` unchanged — root 20 vulns (7 moderate / 12 high /
  1 critical), server 12 (5 moderate / 7 high). Investigation: `xlsx@0.18.5`
  is used for parse (`XLSX.read` on user uploads in `ImportCSV`/`excelImport`
  — the vulnerable surface) and write (exports). Parsing is strictly
  client-side (a malicious file can only hurt its uploader's own tab), and
  SheetJS has no fixed version, so migration (e.g. exceljs) is a feature-sized
  change, not a hardening one-liner.
* Fix applied: practical containment instead of migration — 10MB file cap
  and 10,000-row cap in `ImportCSV` with clear toasts (also prevents the
  one-POST-per-row storm). No lockfile mutations in this pass.
* Verification: `npm audit` counts identical before/after (no new deps);
  frontend suite incl. import paths green. Recommendation: separate upgrade
  PR — `npm audit fix` for the fixable transitive Highs (undici,
  socket.io-parser, qs, postcss), and an exceljs spike for import, each with
  full suite runs.

## H11 — CI triggers and gates

* Severity: MEDIUM
* Current state: `push` trigger listed only `main`, so pushes to the active
  `taxbook-v2` branch skipped CI (PRs were covered). Gates otherwise exist:
  lint → frontend tests → build → backend tests → Playwright e2e → advisory
  audit → docker builds on `main`/`taxbook-v2`.
* Fix applied: one line — `push.branches: [main, taxbook-v2]`.
* Verification: YAML re-read; full local gate run green (see below).
  Follow-up (not done here): add a non-blocking `tsc --noEmit` CI step,
  then ratchet to blocking once H9 is resolved.

## Validation matrix (all executed 2026-09-20, uncommitted tree)

| Check | Command | Result |
|---|---|---|
| Frontend unit | `npx vitest run` (root) | 15 files, **103/103 pass** |
| Backend unit | `npx vitest run` (server) | 4 files, **60/60 pass** (3 new) |
| Typecheck (app) | `npx tsc --noEmit` | 130 → **5 lines, 1 remaining** (H9) |
| Typecheck (hermes) | `npx tsc --noEmit` | clean |
| Lint | `npx eslint .` | **0 errors**, 47 warnings |
| Build | `npm run build` | success (chunk-size warnings only) |
| E2E | `npx playwright test` | **12/12 pass** (11 API + UI smoke) |
| Deps | `npm audit --audit-level=high` | root 20, server 12 — unchanged |
| Prod boot | `NODE_ENV=production node index.js` | exits 1 without `ADMIN_PASSWORD`; boots with it |
| Hermes CORS | live boot + Origin probes | evil blocked, local preflight 204 |

## Files changed (uncommitted)

Server: `middleware/auth.js`, `routes/auth.js`, `lib/refresh-tokens.js`,
`config/env.js`, `db.js`, `__tests__/auth-hardening.test.js` (new).
Infra: `docker-compose.yml`, `.env.example`, `.github/workflows/ci.yml`,
`hermes/src/index.ts`, `hermes/.env.example`.
Frontend (types-only/guards): `types.ts`, `utils/api.ts`, `App.tsx`,
`hooks/{useWorkspaceData,useWebSocket,useRecordsList,useRecordForm,
useCustomFields}.ts`, `components/{LoginPage,Sidebar,RecordCard,ViewDetail,
ReportsTab,AssistantPage,ImportCSV,panels/{FormPanel,ListPanel},
ai-chatbot/message.tsx,charts/charts.tsx}`,
`components/ui/select.tsx`.

## Final status: READY WITH WARNINGS

Blocking findings are closed (bootstrap-admin fail-closed, Hermes CORS
default-deny, session revocation, JWT alg pinning, 55/56 tsc errors fixed
incl. 2 runtime ReferenceErrors, CI branch coverage). Remaining warnings
requiring owner decisions: HttpOnly-cookie migration plan (H4), SettingsTab
field-shape unification (H9), xlsx/exceljs + transitive-upgrade PR (H10),
non-blocking `tsc` CI step (H11 follow-up).
