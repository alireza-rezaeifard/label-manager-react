# Final Release Gate Report

## Repository

Branch: `taxbook-v2`
Commit: `7a08347` (`Surface AI provider errors instead of silent empty chat responses`)
Working tree: **55 modified files (uncommitted, intentional — two prior
passes) + 4 untracked** (`docs/architecture/` pre-existing,
`docs/audit/`, `server/__tests__/auth-hardening.test.js`,
`src/__tests__/ocr.test.ts`). No resets, reverts, commits, or branch
changes performed. Prior fixes were NOT removed.

Change review: the full `git diff` (285+/140-) was re-read file by file.
Every hunk traces to the audit or hardening reports. No accidental,
unrelated, or speculative modifications found. All API payload shapes are
byte-identical to HEAD (client changes are type-only except the documented
intended guards); all server route/schema behavior is unchanged except the
documented hardening (JWT alg pin, username policy, pw-change revocation,
ADMIN_PASSWORD fail-fast, Hermes CORS deny).

## Verification

| Check | Result | Details |
| ----- | ------ | ------- |
| Frontend unit tests | PASS | `npx vitest run` — 15 files, **103/103** (incl. `ocr.test.ts`) |
| Backend tests | PASS | `npx vitest run` in `server/` — 4 files, **60/60** (incl. new `auth-hardening.test.js`, 3 tests) |
| E2E | PASS | `npx playwright test` — **12/12** (11 API incl. lockout/rotation/isolation + UI smoke) |
| TypeScript (app) | PASS WITH 1 KNOWN | `npx tsc --noEmit` — exactly **1 error** (`App.tsx:1218`, RG-01); was 56 entries at `7a08347` |
| TypeScript (hermes) | PASS | `npx tsc --noEmit` clean |
| ESLint | PASS | 0 errors, 47 warnings (all `no-explicit-any`/benign `exhaustive-deps`) |
| Build | PASS | `npm run build` — success; chunk-size warnings only (pre-existing) |
| npm audit | ADVISORY | root 20 (7 mod/12 high/1 crit), server 12 (5 mod/7 high); unchanged, no new deps |
| Secret scan | PASS | tracked files: only `*.env.example` placeholders; key-pattern scan: only `node_modules` false positives; `admin123` confined to dev default + test/e2e fixtures |
| CORS | PASS | backend allowlist unchanged; Hermes default-deny live-verified (evil origin blocked, local preflight 204) |
| Authentication | PASS | login/refresh-rotation/logout/lockout e2e 7/7; alg pin + revocation covered by unit tests |
| Production boot | PASS | `NODE_ENV=production` without `ADMIN_PASSWORD` → exit 1 with clear message; with it set → boots into migrations |

## Remaining Issues

ID: RG-01 · Severity: LOW (gate) / MEDIUM (debt)
Description: `App.tsx:1218` — `CustomField[]` passed to SettingsTab's local
`CustomFieldSettings[]` (required `fieldType`).
Impact: display-only. SettingsTab degrades gracefully (`f.fieldType ||
'text'`, badge fallback), so a `type`-shaped field (e.g. dropdown created
via "add field") shows the wrong badge/edit-type until re-saved; round-trip
preserves `type` (merge spreads), so no data loss. No crash.
Why it remains: unifying the shapes changes SettingsTab rendering/editing —
a product decision, per instructions not made here.
Owner decision required: see "Product question" below.

ID: RG-02 · Severity: HIGH (residual)
Description: access + refresh tokens and LLM keys in cleartext
`localStorage` (api.ts, LoginPage write; AppContext/useWebSocket/
ArtifactCard read). Mitigated by 12h access, single-use rotating refresh
with reuse theft-kill, no `dangerouslySetInnerHTML`.
Impact: any XSS = session/key theft.
Why it remains: migration is a coordinated multi-surface change (see plan
below), unsafe as a drive-by.
Owner decision required: schedule the HttpOnly-cookie migration as its own
PR with dual-write transition.

ID: RG-03 · Severity: HIGH (advisory, contained)
Description: `xlsx@0.18.5` (direct dep, latest published — lineage frozen,
npm reports "No fix available"): prototype pollution + ReDoS on parse.
Impact: contained — parsing is strictly client-side (a malicious file can
only hurt its uploader's tab), pollution is page-JS-scoped, and the new
10MB / 10,000-row caps bound ReDoS/memory plus the per-row POST storm.
Why it remains: no safe upgrade exists; exceljs migration is feature-sized.
Owner decision required: approve exceljs import-spike vs. accept containment.

ID: RG-04 · Severity: HIGH (conditional)
Description: Hermes exposes file/shell/db tools with no auth of its own;
now default-deny CORS, port unpublished in compose.
Impact: only if the port becomes network-reachable.
Why it remains: defense-in-depth auth (shared secret) not yet added.
Owner decision required: keep off public nets, or add shared-secret auth.

ID: RG-05 · Severity: MEDIUM
Description: `tsc --noEmit` is not a CI gate.
Impact: type debt can regrow silently.
Why it remains: making it blocking today would fail CI on RG-01.
Owner decision required: add as non-blocking/informational now; flip to
blocking after RG-01. (CI itself was NOT changed in this pass — a failing
gate must never be introduced silently.)

ID: RG-06 · Severity: LOW
Description: password change now revokes the changer's own refresh token
too — after their access token expires they re-login. Intended
(session-invalidation standard), but users should expect one re-login.
Why it remains: intended behavior. No decision needed; release-note it.

ID: RG-07 · Severity: LOW
Description: oversized chunks (`ChatPage` ~824KB, `vendor-export` ~1.2MB),
ineffective `api.ts` dynamic import, eager QRScanner.
Impact: initial-payload weight only; no correctness/deployment issue.
Why it remains: optimization deferred per instructions.
Owner decision required: none for release; schedule lazy-split follow-up.

ID: RG-08 · Severity: MEDIUM (guardrail)
Description: `proxy-server.cjs` remains an open relay by design, now
loopback-bound with a dev-only banner.
Impact: none while local; SSRF/open-proxy if ever hosted.
Why it remains: dev helper some flows document; deletion is owner call.
Owner decision required: delete the file or keep local-only.

ID: RG-09 · Severity: MEDIUM (known, pre-existing)
Description: helmet CSP `reportOnly`, AI rate limit in-memory per-user,
seed `admin/admin123` fallback outside production, `bcryptjs` sync hashing.
Impact: staged-rollout posture, documented in prior reports.
Why it remains: each needs staged rollout/owner sign-off. No change.

ID: RG-10 · Severity: LOW (ops notes)
Description: dev ran Node 24 vs Node 20 containers; Dockerfiles use the
`docker.arvancloud.ir` mirror (unreachable outside Iran without config);
`dist/`/`public/` carry a stray `test-report.pdf` fixture (copied by vite,
untracked, harmless).
Why it remains: environment-specific; operator to confirm builder access.
No change.

## Security Status

BLOCKING: **none**.
HIGH: RG-02 (XSS-exfiltable tokens — mitigated, migration planned), RG-03
(xlsx unpatched — contained client-side + capped), RG-04 (Hermes auth —
unpublished port + CORS deny).
MEDIUM: RG-05, RG-08, RG-09.
LOW: RG-01, RG-06, RG-07, RG-10.

Controls re-verified present: HS256 pin, rotating refresh + reuse kill,
pw-change revocation, 5-fail/15-min lockout without enumeration, register
username/password policy, workspace RBAC + tenant isolation, socket rooms
membership-gated, uploads dual-authed, HMAC webhooks, CORS allowlists,
layered rate limits, `trust proxy: loopback`, JSON/file size caps, FTS5
recovery, fail-fast prod config, non-root image, healthchecks.

## Production Risks

1. Operator omits `ADMIN_PASSWORD`/`JWT_SECRET` → container exits 1
   (fail-closed; compose errors with guidance). Ensure secrets are set.
2. Default `admin/admin123` still seeds non-production boots — rotate
   immediately after first login anywhere.
3. Post-password-change re-login (RG-06) — release-note for support.
4. RG-02/RG-03/RG-04 residual HIGHs — accepted with mitigations above;
   track as post-release work, not release blockers.

## Recommended Next Actions

MUST DO BEFORE DEPLOY:
* Set `JWT_SECRET` (≥32 chars), `ADMIN_PASSWORD`, `ALLOWED_ORIGINS`,
  `HERMES_URL` for the prod environment; confirm builder reaches the
  container base-image registry.
* Rotate the bootstrap admin credential after first login.
* Confirm Hermes port stays unpublished / unreachable publicly.

SHOULD DO SOON:
* HttpOnly-cookie migration PR (plan below).
* Resolve RG-01 (product question), then make `tsc --noEmit` a blocking
  CI step (informational step acceptable immediately).
* Controlled dependency-upgrade PR (`npm audit fix` for transitive Highs).
* Decide `proxy-server.cjs` deletion vs. local-only retention.

CAN BE DEFERRED:
* Chunk lazy-splitting (RG-07), CSP enforce flip after log review,
  exceljs import-spike (RG-03), argon2id evaluation, Node version
  alignment, `api-generated.d.ts` dead-file cleanup, README drift fixes.

## Product question (RG-01 — do not decide here)

Current behavior: custom fields exist in two runtime shapes —
`CustomField { key,label,fa,type,… }` (server, add-field flow, restore
after this pass writes both keys) and SettingsTab-local
`CustomFieldSettings { key,label,fa,fieldType,… }`. SettingsTab falls back
to `'text'` when `fieldType` is absent, so `type`-shaped fields display the
wrong badge and open the editor with the wrong type preselected; saving
preserves the original `type` via merge, so no data loss.
Options: (a) canonicalize on `type` everywhere incl. SettingsTab +
migration of stored payloads; (b) canonicalize on `fieldType`; (c) keep
both with a documented normalizer at the SettingsTab boundary.
Behavioral impact: (a)/(b) change what SettingsTab renders and writes for
existing fields; (c) is display-only. Recommended question for the owner:
"Which field-type key is canonical for custom fields, and may the other be
migrated away in stored data (localStorage caches, backups)?"

## Authentication Migration Plan (future — NOT implemented)

Current architecture (verified in this tree): access (12h JWT, HS256,
`{id,username,role}`) + rotating single-use refresh (SHA-256 at rest, 30d,
reuse = kill-all-sessions) stored in `localStorage` (`auth_token`,
`auth_refresh_token`, `auth_user`); Bearer injection in `apiRequest` with
deduped silent refresh; logout = server revoke + local clear;
pw-change = revoke-all; socket.io `auth: { token }` verified against the
same secret; no cookies, no CSRF exposure (no ambient auth), CORS allowlist
without credentials.
Frontend changes: replace `localStorage` token reads/writes with
cookie-based flow (keep `auth_user` profile cache only); `fetch` with
`credentials: 'include'` for `/api`; remove `Authorization` sends
same-origin; socket.io `withCredentials`; UI re-login handling on 401.
Backend changes: set `__Host-`-prefixed HttpOnly/Secure/SameSite cookies
on login/register/refresh (short-lived access + rotating refresh);
middleware accepts cookie-first, Bearer-fallback (API-key clients);
refresh endpoint rotates via cookie; logout clears cookies + revokes.
CORS changes: `credentials: true` + exact-origin allowlist (no `*`,
no null-origin bypass) on backend and Hermes.
CSRF protection: SameSite=Lax/St
...[truncated 1408 chars]