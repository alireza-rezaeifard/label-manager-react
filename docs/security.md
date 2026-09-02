# TaxBook — Security

## Authentication
- JWT bearer tokens; secret from `JWT_SECRET` (validated, ≥32 chars required in production — fail fast).
- Token TTL configurable via `JWT_EXPIRES_IN` (default 12h; was previously hardcoded 7d).
- Passwords hashed with bcrypt (cost 10). Argon2id evaluation is a Phase 8 item.
- Default admin seeding is for local setup only — change the password immediately; production deployments should set `ADMIN_USERNAME`/`ADMIN_PASSWORD`.

## Tenancy
- Every workspace-owned query verifies `user → workspace_members → role → resource.workspace_id` — including **list** endpoints (`GET /api/records`, `/all`, `/trash` when filtered by workspace): non-members receive an empty view instead of workspace contents (IDOR class bug found by E2E and fixed, see modernization report).
- Role hierarchy: owner(10) > admin(8) > editor(5) > viewer(1); enforced per route via `server/lib/authz.js` (`assertWorkspaceRole`, `loadRecordForUser`, `resolveWorkspaceId`).
- `resolveWorkspaceId` resolves the target workspace for writes: explicit `workspace_id` wins; otherwise the user's single membership; legacy fallback to workspace 1 only if the user is a member — never a silent cross-tenant write.

## Transport & headers
- Helmet enabled (CSP currently disabled — Phase 8 will add a report-only CSP first).
- CORS restricted to `ALLOWED_ORIGINS` (validated at boot).
- Body size limited (`JSON_BODY_LIMIT`, default 10mb).

## Rate limiting
- Global API: 500 req / 15 min per IP.
- Login/register: 10 req / 15 min per IP, plus **per-account lockout** (audit S7): 5 failed attempts lock the account for 15 minutes (`429 ACCOUNT_LOCKED`); successful login resets the counter; unknown usernames never reveal lockout state. The IP limiter is skipped for standalone E2E runs (`E2E_LISTEN=1`) so the lockout itself can be tested deterministically.

## Integrity / idempotency
- `Idempotency-Key` on record creation prevents duplicate financial records on network retries.
- All SQL uses prepared statements — no string-concatenated user input.

## Logging
- Structured Pino logs include `requestId`, user, status, duration. Passwords, tokens and secrets are never logged; production error responses hide internals.

## File uploads
- Multer size limits + Sharp processing for images; MIME/extension validation in artifact routes.
- multer 1.x upgrade to 2.x is tracked (Phase 8).
