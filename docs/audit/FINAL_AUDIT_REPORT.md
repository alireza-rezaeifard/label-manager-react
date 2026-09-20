# Project Audit Report

## Project Information

* Repository: `https://github.com/alireza-rezaeifard/label-manager-react.git`
* Branch: `taxbook-v2`
* Commit SHA: `7a0834744b3ef5dc30896f68d1ddeadcc90fa409`
* Audit date: 2026-09-20
* Working tree at start: clean except untracked `docs/architecture/`
* Reports: `docs/audit/architecture-review.md`, `docs/audit/FINAL_AUDIT_REPORT.md`
  (Archify skill not installed in this environment, so no generated
  `docs/audit/architecture/` diagram site — architecture is documented in
  `architecture-review.md` from direct source evidence.)

## Executive Summary

Full-stack Persian RTL record/label/TaxBook app (React 19 + Express +
better-sqlite3 + Hermes AI agent). The codebase is in solid production shape:
real auth hardening (JWT + rotating refresh + lockout), tenant isolation,
FTS5 recovery, structured logging, health checks, non-root containers, and a
CI pipeline with unit + API + UI-smoke coverage. The audit found **22 issues**,
**fixed 11 safe ones** (including 2 real runtime bugs), verified everything by
executing the full validation matrix, and left the rest as documented,
decision-gated risks. No dependencies added; no architecture rewritten; no
business behavior changed except making OCR field extraction do what its types
and consumer already assumed. **Final status: READY WITH WARNINGS.**

## Findings

ID: F-BUG-01 · Category: Correctness · Severity: CRITICAL
Location: `src/utils/ocr.ts:11-19`
Problem: `patterns: [RegExp, string][]` held bare RegExp values; `for (const
[regex, key] of patterns)` destructuring throws at runtime → OCR field
auto-fill (`RecordForm` `handleOcrExtract`) never worked.
Impact: OCR feature silently dead (thrown inside try/catch → error toast).
Fix applied: paired each pattern with its key
(`code,date,amount,party,project,tax,discount` matching the consumer);
exported `extractFields`; added `src/__tests__/ocr.test.ts`.
Verification: new tests 2/2 pass; `tsc` ocr errors gone; full suite green.

ID: F-BUG-02 · Category: Correctness · Severity: MEDIUM
Location: `src/components/ai-chatbot/message.tsx:240`
Problem: `AIToolCall{toolName,args}` passed to `ToolCard` expecting
`{name,args,result?}` → tsc error + tool name rendered as `undefined` in
message history.
Impact: cosmetic data loss in AI chat history.
Fix applied: adapter at render site
`tc={{ name: tc.toolName, args: tc.args }}`.
Verification: tsc error gone; frontend tests 103/103.

ID: F-TYPE-01 · Category: Code quality · Severity: HIGH
Location: `src/types.ts:83`, `src/components/TableView.tsx:4`,
`src/components/PrintQueue.tsx:4`
Problem: `export type Record = RecordItem` shadowed the global
`Record<K,V>` utility (broke `Record<string,…>` in the same file + latent
misuse at import sites).
Impact: 2 tsc errors; confusion hazard across the codebase.
Fix applied: renamed alias to `LabelRecord`; updated the 2 importing files.
Verification: tsc errors gone; tests/build green.

ID: S-01 · Category: Security · Severity: CRITICAL (if deployed)
Location: `proxy-server.cjs`
Problem: open CORS relay — arbitrary target URL, forwarded Authorization,
`*` CORS, all-interface bind, no logging.
Impact: SSRF/open-proxy if ever hosted.
Fix applied: dev-only warning banner + bind restricted to `127.0.0.1`.
Verification: code inspection; not started (dev helper). Residual risk R-01:
still an open relay by design — never expose; consider deleting.

ID: S-02 · Category: Security · Severity: MEDIUM
Location: `.gitignore`
Problem: `.env.*` variants, `server/uploads/`, `hermes/dist/` not ignored.
Impact: easy accidental secret/artifact commit.
Fix applied: added `.env`, `.env.*`, `server/.env`, `hermes/.env` + example
negations, `server/uploads/`, `uploads/`, `hermes/dist/`.
Verification: `git check-ignore` confirms; `git ls-files` shows no tracked
secrets/artifacts.

ID: Q-01 · Category: Code quality · Severity: LOW
Location: 26 files (imports/vars) + `src/components/ImportCSV.tsx:200`
Problem: 30+ unused imports/vars (TS6133 + eslint) + debug `console.log` of
imported record data.
Impact: noise; minor data-logging hygiene.
Fix applied: safe deletions only (incl. `STEP_LABELS`, `withCorsProxy`,
`loadTemplates`, `PriceInput`, `FIELDS`/`useEffect` in `useRecordForm`).
Verification: eslint 79→48 warnings (0 errors); tsc 171→130 lines; all green.

ID: S-03 · Category: Security · Severity: HIGH — NOT FIXED (decision-gated)
Location: `src/utils/api.ts`, `AssistantPage`, `ChatPage`, `SettingsTab`
Problem: JWT + refresh token + third-party LLM keys in cleartext
`localStorage` (XSS-exfiltable). Mitigations present: 12h access, rotating
single-use refresh (SHA-256 at rest), no `dangerouslySetInnerHTML` anywhere.
Remaining: migrate session to httpOnly/Secure/SameSite cookies + server-side
LLM-key vault/proxy.

ID: S-04 · Category: Security · Severity: HIGH — NOT FIXED (decision-gated)
Location: `hermes/src/index.ts:13,141`
Problem: `cors()` allow-all + `0.0.0.0:3002`, no auth, ~40 tools incl.
shell/files/db. Safe only on the private compose network.
Remaining: keep off public nets or add shared-secret auth.

ID: S-05 · Category: Security · Severity: HIGH — NOT FIXED (decision-gated)
Location: `package.json:61` (`xlsx@0.18.5`), transitive `undici`,
`socket.io-parser`, `qs`, `postcss`
Problem: `npm audit`: frontend 20 vulns (7 moderate/12 high/1 critical),
server 12 (5 moderate/7 high). `xlsx` has **no fix** (prototype
pollution + ReDoS); the rest are fixable via `npm audit fix`.
Remaining: controlled upgrade PR (tests must re-run); constrain `xlsx` to
export / validate imports with `papaparse`.

ID: T-01 · Category: Testing/Types · Severity: MEDIUM — NOT FIXED
Location: `src/App.tsx` (majority), `ReportsTab`, `ui/select`, `ViewDetail`,
`useRecordForm`, `useCustomFields`, `AssistantPage:366`
Problem: ~85 remaining `tsc --noEmit` errors (strict null/undefined,
`CustomField.fieldType` vs `type` drift, ApexCharts event types). CI and
`npm run build` (vite, no typecheck) do not gate on `tsc`.
Remaining: add non-blocking `tsc` CI step, then ratchet to blocking; fix
incrementally — no big-bang refactor.

ID: D-01 · Category: Deployment · Severity: MEDIUM — NOT FIXED
Location: `.github/workflows/ci.yml:6-7`
Problem: `push` trigger lists only `main` — pushes to `taxbook-v2` (the
active branch) skip CI. (PRs into it are covered.)
Remaining: one-line owner change (`push.branches: [main, taxbook-v2]`).

ID: P-01 · Category: Performance · Severity: MEDIUM — NOT FIXED
Location: build output; `src/hooks/useWorkspace.ts`
Problem: oversized chunks (`ChatPage` 824KB, `vendor-export` 1197KB,
`index` 766KB gzip 219–374KB); `INEFFECTIVE_DYNAMIC_IMPORT` (`api.ts`
statically + dynamically imported); no route-level split of heavy export
path; QRScanner 133KB eager.
Remaining: lazy-load export/QR paths; fix the `api.ts` dynamic import;
consider raising chunk guard only after splitting.

Other LOW observations (not fixed, see architecture review §2 P15): CSP
`reportOnly` (staged — flip after log review), in-memory per-user AI
rate-limit (no shared store), README/docs drift, unimported
`api-generated.d.ts`, seed `admin/admin123` fallback (documented, dev
bootstrap), `bcryptjs` sync hashing, Iran-mirror Docker base images,
React 19 vs Node 20 container skew (dev ran Node 24 fine).

## Security Findings

* No hardcoded secrets/keys/tokens in source; no `.env` tracked; `.gitignore`
  hardened (S-02).
* AuthN/Z verified good: fail-fast `JWT_SECRET` (≥32 in prod), bcrypt-10,
  lockout without enumeration, workspace role hierarchy + tenant isolation,
  socket rooms membership-gated, uploads behind dual auth, HMAC webhooks,
  CORS allowlist + `trust proxy: loopback`, layered rate limits.
* XSS: no `dangerouslySetInnerHTML`; Markdown via `react-markdown+remark-gfm`
  (confirm `rehype-sanitize` if untrusted HTML ever rendered); backend
  `sanitizeObject` only applied in `records.js` — extend to other routes.
* Must-decide: S-03 (token/key storage), S-04 (Hermes exposure), S-05
  (vulnerable deps), S-01 residual (delete or flag-gate the proxy).

## Performance Findings

* Build clean in <1s incremental; manualChunks working (react/charts/export
  split); lazy `Suspense` per tab with skeletons; virtualized grid;
  TanStack Query 30s stale + WS invalidation + 15s activity poll (sane).
* Watch items (P-01): 500KB+ chunk warnings, ineffective dynamic import,
  eager QRScanner/Tesseract CDN, FTS5 + pagination already bounded
  (limit ≤1000 / all ≤10000).

## Code Quality Findings

* eslint: **0 errors**, 79→48 warnings (remaining are `no-explicit-any` in
  utils/tests + a few `exhaustive-deps` in `App.tsx`/`ChatPage` — intentional
  or benign, each reviewed).
* `tsc --noEmit`: 171→130 error lines; residue is strictness debt in the
  `App.tsx` god-component (1516 lines) + type drift (`CustomField`,
  ApexCharts, `ui/select`, `ViewDetail`) — incremental cleanup only.
* Duplication noted (not refactored): 3 fetch patterns (`api.ts` vs raw
  `fetch` in `taxBookExport`/`ArtifactCard`), 3+ Jalali/digit util
  implementations (`formatters` vs `lib/persianDate` vs `dashboard/jalali`
  vs hermes `report/jalali`), `RecordsPage` vs `App` list logic.

## Testing Status (all actually executed 2026-09-20)

| Suite | Command | Result |
|---|---|---|
| ESLint | `npx eslint .` | 0 errors, 48 warnings (was 79) |
| Typecheck | `npx tsc --noEmit` | 171→130 error lines (residue documented, not CI-gated) |
| Frontend unit | `npx vitest run` | **15 files, 103/103 pass** (incl. new `ocr.test.ts`) |
| Backend unit | `JWT_SECRET=… npx vitest run` (in `server/`) | **3 files, 57/57 pass** |
| E2E API | `npx playwright test e2e/api` | **11/11 pass** (auth, lockout, refresh rotation, records, idempotency, isolation) |
| E2E UI smoke | `npx playwright test e2e/ui` | **1/1 pass** (browser login) |
| Build | `npm run build` | success (chunk-size warnings only) |
| Audit (deps) | `npm audit --audit-level=high` (root + server) | root 20 (7 mod/12 high/1 crit), server 12 (5 mod/7 high) — advisory, `|| true` in CI |

## Deployment Readiness

Can this run in production? **Yes, with the warnings below.**
Blockers: none (build + all tests + e2e green; fail-fast prod config;
healthchecks; non-root image; backups/WAL checkpoints; graceful shutdown).
Warnings that must be owned before/after go-live:
1. Set `JWT_SECRET` (≥32), `ADMIN_PASSWORD`, `ALLOWED_ORIGINS`, `HERMES_URL`
   for prod (compose requires `JWT_SECRET`); rotate the `admin/admin123`
   bootstrap immediately.
2. Keep Hermes unreachable from the public internet (R-02) until auth added.
3. Never run `proxy-server.cjs` outside localhost (R-01).
4. Plan the `xlsx`/transitive-vuln upgrade PR (R-03) and the CSP-enforce +
   CI `tsc` steps (R-04).
5. Note Iran-mirror base images (`docker.arvancloud.ir`) — ensure the prod
   builder can reach them or repoint to `docker.io`.

## Changes Made (uncommitted, per instructions)

31 files, +54/−69 (`git diff --stat`), plus 1 new test file and 2 audit docs:
`.gitignore`, `proxy-server.cjs`, `src/types.ts`, `src/utils/ocr.ts`,
`src/utils/excelImport.ts`, `src/utils/taxBookExport.ts`,
`src/hooks/useRecordForm.ts`, `src/hooks/useControllableState.ts`,
`src/components/{AssistantPage,CommentsPanel,ImportCSV,PrintQueue,RecordForm,
RecordsPage,Sidebar,TableView,TaxBookExportModal,VirtualizedRecordGrid,
ai-chatbot/{greeting,icons,message,messages,shimmer,suggested-actions},
chatbot/suggested-actions,ui/{dropdown-menu,message,scroll-area,tabs}}`,
`src/__tests__/{App.test,s
...[truncated 911 chars]