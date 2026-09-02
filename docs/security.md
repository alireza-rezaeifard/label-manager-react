# TaxBook — Security

## Authentication
- JWT bearer tokens; secret from `JWT_SECRET` (validated, ≥32 chars required in production — fail fast).
- Token TTL configurable via `JWT_EXPIRES_IN` (default 12h; was previously hardcoded 7d).
- Passwords hashed with bcrypt (cost 10). Argon2id evaluation is a Phase 8 item.
- Default admin seeding is for local setup only — change the password immediately; production deployments should set `ADMIN_USERNAME`/`ADMIN_PASSWORD`.

## Authorization / tenancy
- Every workspace-owned query verifies `user → workspace_members → role → resource.workspace_id`.
- Role hierarchy: owner(10) > admin(8) > editor(5) > viewer(1); enforced per route.
- Known hardening item (Phase 5): extract a single `loadRecordForUser(minRole)` helper to remove per-route duplication.

## Transport & headers
- Helmet enabled (CSP currently disabled — Phase 8 will add a report-only CSP first).
- CORS restricted to `ALLOWED_ORIGINS` (validated at boot).
- Body size limited (`JSON_BODY_LIMIT`, default 10mb).

## Rate limiting
- Global API: 500 req / 15 min per IP.
- Login: 10 req / 15 min (brute-force dampening). Per-account lockout is a Phase 8 item.

## Integrity / idempotency
- `Idempotency-Key` on record creation prevents duplicate financial records on network retries.
- All SQL uses prepared statements — no string-concatenated user input.

## Logging
- Structured Pino logs include `requestId`, user, status, duration. Passwords, tokens and secrets are never logged; production error responses hide internals.

## File uploads
- Multer size limits + Sharp processing for images; MIME/extension validation in artifact routes.
- multer 1.x upgrade to 2.x is tracked (Phase 8).
