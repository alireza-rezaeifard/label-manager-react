# Architecture Review — label-manager-react (TaxBook v2)

Audit date: 2026-09-20 · Branch: `taxbook-v2` · Commit: `7a08347`
Scope: `src/` (React 19 + Vite frontend), `server/` (Express + better-sqlite3),
`hermes/` (AI agent service), `proxy-server.cjs` (dev helper), Docker/CI config.

## 1. Current architecture (verified from source)

### 1.1 Runtime

```
Browser (React SPA, dist/ served by nginx or Express)
  │  /api/*  →  Express server (server/index.js, :3001)
  │  /socket.io → same Express (server/ws.js)
  │  /api/ai/* → Express → Hermes agent (hermes/src/index.ts, :3002)
  │                → user-configured LLM provider (OpenRouter/OpenAI-compatible)
```

* Entry `src/main.tsx` → `BrowserRouter` → `AppProvider` (`src/context/AppContext.tsx`)
  → `src/App.tsx` (1516 lines). No `<Routes>` — manual path-derived tab state
  (`records|add|import|preview|view|history|profile|settings|reports|dashboard|
  assistant|chat|workspace`) with lazy `Suspense` pages.
* State layers: `AppContext` (shell: theme/tab/sidebar/auth flags) →
  `useWorkspaceData` (319 lines, central server-mode cache) → domain hooks
  (`useRecords`, `useRecordsList`, `useRecordForm`, `useCustomFields`,
  `usePrintExport`, `useWorkspace`, `useWebSocket`, `useToast`) → server-state
  cache `useSWR` (TanStack Query singleton, 30s stale) → AI `chatStore`
  (module singleton, SSE, localStorage persistence).
* API facade `src/utils/api.ts` (286 lines): Bearer injection, single-flight
  `POST /auth/refresh` retry, `aiChat` SSE generator. A few bypasses exist
  (raw `fetch` in `taxBookExport.ts`, `ArtifactCard.tsx`) — no auth-refresh there.

### 1.2 Data flow / storage

* Dual mode: `currentRecords = serverMode ? serverRecords : records`
  (`src/App.tsx:104`). Local mode = `localStorage` + capped undo stack (20).
* Server: `better-sqlite3` WAL (`server/db.js`, 452 lines). 13 tables
  (`users, workspaces, workspace_members, workspace_invites, records,
  activity_log, record_versions, api_keys, custom_fields,
  notification_preferences, webhooks, ai_artifacts` + refresh/idempotency
  stores), FTS5 `records_fts` with boot-time health check + rebuild,
  tenant isolation (`WHERE 1=0` for non-members), versioning + activity log +
  workspace broadcast (socket.io rooms) + HMAC webhooks on every mutation
  (`server/routes/records.js`).
* Auth: `bcryptjs` (cost 10) + short-lived JWT (12h) + rotating single-use
  refresh tokens (SHA-256 at rest, 30d) + 5-fails/15-min account lockout
  without user enumeration. Tokens live in `localStorage` (see §3).
* Realtime: `socket.io` with JWT handshake, membership-gated rooms.
* AI path: `ChatPage/AssistantPage` → `chatStore` → `POST /api/ai/chat`
  (30 req/15min/user, 15k prompt cap, workspace ACL, 120s abort, SSE
  artifact-intercept to `uploads/ai-artifacts/`) → Hermes `:3002`
  (`streamText`, ~40 tools: files/shell/git/search/db/report/web/mcp).

### 1.3 Build / deploy

* `vite build` (manualChunks: vendor-react/vendor-charts/vendor-export),
  `Dockerfile` (multi-stage, non-root `appuser`, healthcheck
  `/api/version`), `Dockerfile.frontend` (nginx, SPA fallback + `/api`,
  `/api/ai` streaming, `/socket.io` proxies), `docker-compose.yml`
  (label-studio + hermes + frontend), CI (`.github/workflows/ci.yml`):
  lint → frontend tests → build → backend tests → Playwright e2e →
  advisory `npm audit` → docker builds on `main`/`taxbook-v2`.

## 2. Detected problems (with disposition)

| # | Problem | Severity | Disposition |
|---|---------|----------|-------------|
| P1 | `ocr.ts extractFields`: `[RegExp,string][]` filled with bare RegExp — destructuring throws at runtime, OCR field fill never worked | CRITICAL (bug) | **Fixed** — keys added (`code,date,amount,party,project,tax,discount`); `extractFields` exported; regression test added |
| P2 | `types.ts`: `export type Record = RecordItem` shadows global `Record<K,V>` → 2 tsc errors in-file + latent misuse | HIGH | **Fixed** — renamed to `LabelRecord`; `TableView`, `PrintQueue` updated |
| P3 | `message.tsx` ToolCard passed `AIToolCall{toolName}` where `{name}` expected → tsc error + tool name never rendered in history | MEDIUM (bug) | **Fixed** — adapter at render site |
| P4 | `proxy-server.cjs` open relay (any URL + forwarded Authorization, `*` CORS, all interfaces) | CRITICAL if deployed | **Mitigated** — dev-only banner + loopback bind; must never ship (see report R-01) |
| P5 | `.gitignore` gaps: `.env.*` variants, `server/uploads`, `hermes/dist` | MEDIUM | **Fixed** |
| P6 | Debug `console.log` of imported record data in `ImportCSV` | LOW | **Fixed** (removed) |
| P7 | 30+ unused imports/vars (TS6133 errors + eslint warnings) | LOW | **Fixed** (safe deletions only) |
| P8 | ~85 remaining `tsc` errors, concentrated in `App.tsx` god-component (null/undefined strictness), `ReportsTab` ApexCharts event types, `ui/select`, `ViewDetail`, `CustomField.fieldType` vs `type` drift, `AssistantPage` toolCall shape | MEDIUM (tech debt) | **Not fixed** — needs design decisions; `npm run build` (vite, no typecheck) and CI do not gate on `tsc`, so not a build blocker |
| P9 | JWT + refresh + LLM API keys in cleartext `localStorage` (XSS-exfiltable) | HIGH | **Not changed** — architecture decision (httpOnly-cookie migration); refresh rotation + short-lived access already mitigate |
| P10 | Hermes `cors()` allow-`*` + `0.0.0.0` bind; shell/file/db tools reachable if exposed | HIGH if exposed | **Not changed** — safe only on private docker net; documented as R-02 |
| P11 | `xlsx@0.18.5` High CVEs, no fix available; `undici`/`socket.io-parser`/`qs` Highs fixable | HIGH | **Not changed** — dep swap needs owner decision; documented with path |
| P12 | Helmet CSP `reportOnly`, AI rate-limit in-memory per-user, no shared store | MEDIUM | **Not changed** — staged rollout by design; documented |
| P13 | Bundle: `ChatPage` 824KB / `vendor-export` 1197KB / `index` 766KB chunks; ineffective dynamic import of `api.ts` | MEDIUM | **Not changed** — perf follow-up, documented |
| P14 | CI `push` trigger omits `taxbook-v2` (current branch) — pushes skip CI | MEDIUM | **Not changed** — one-line workflow change, left for owner (documented) |
| P15 | `src/types/api-generated.d.ts` generated but imported nowhere; README structure/docs drift (`JWT 7d`, rate limits, missing env vars, duplicate bullet) | LOW | **Not changed** — docs cleanup left for owner |

## 3. Improvements made (this audit)

* Fixed P1–P7 (31 files, +54/−69; see `git diff --stat`). No business logic,
  routes, schemas, or public APIs changed — except the OCR fix, which makes
  `extractFields` do what its types and its consumer (`RecordForm`
  `fields.code/party/amount/project/date`) already assumed.
* Added `src/__tests__/ocr.test.ts` (2 tests, passing).
* Hardened `.gitignore`; verified no secrets tracked (`git ls-files` clean).
* Re-verified: eslint 0 errors (79→48 warnings), `tsc` 171→130 error lines,
  frontend 103/103, server 57/57, Playwright API 11/11 + UI smoke 1/1,
  `vite build` clean (chunk-size warnings only).

## 4. Remaining risks

1. **R-01 (CRITICAL guardrail):** `proxy-server.cjs` must never run outside
   localhost — banner + loopback bind added, but it is still an open relay by
   design. Consider deleting the file or gating it behind an explicit
   `--dev-proxy` flag.
2. **R-02 (HIGH):** Hermes has no auth of its own; network exposure =
   unauthenticated LLM-key usage + file/shell/db tool execution. Keep it off
   public networks or add a shared-secret check in `hermes/src/index.ts`.
3. **R-03 (HIGH):** `xlsx` without fix — constrain to export-only, validate
   imports via `papaparse`, run `npm audit fix` for the fixable Highs
   (undici, socket.io-parser, qs, postcss) in a controlled PR with test runs.
4. **R-04 (MEDIUM):** `tsc` debt (~85 errors) will keep growing while CI
   ignores typechecking. Add a non-blocking `tsc --noEmit` CI step first,
   then ratchet to blocking.
5. **R-05 (MEDIUM):** `App.tsx` (1516 lines) is the scaling bottleneck for
   every future change; any refactor must be incremental (extract one
   tab/panel at a time with the e2e suite green).
6. **R-06 (LOW):** React 19 + Node 24 dev vs Node 20 containers; `bcryptjs`
   sync hashing on login path; `docker.arvancloud.ir` mirror in Dockerfiles
   (fails outside Iran without mirror config).
