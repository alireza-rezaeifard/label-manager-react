# TaxBook — API

Base URL: `/api` (legacy alias) or `/api/v1`. Interactive docs: `/api/docs` (Swagger UI). Version: `GET /api/version`.

## Authentication
- `POST /api/auth/login` — `{ username, password }` → `{ token }` (JWT, TTL via `JWT_EXPIRES_IN`, default 12h). Rate limited 10/15min.
- `Authorization: Bearer <token>` on all protected routes.

## Conventions
- Errors: `{ "error": string, "code": string }` with `X-Request-Id` response header.
- A report-only Content-Security-Policy is served on API/HTML responses (staged rollout — flip to enforcing once violation reports are clean).
- Pagination: `?page=&limit=` (records list default 200, hard cap 1000).
- Idempotency: send `Idempotency-Key: <uuid>` on `POST /api/records`; retries return the original 201 response with header `Idempotency-Replayed: true`. Keys are scoped per user and purged after 24h.

## Typed frontend client
- `npm run generate:api-types` → `src/types/api-generated.d.ts` (interfaces for all component schemas: Record, Workspace, WorkspaceMember, CustomField, ActivityLog, RecordVersion, Error).
- Regenerate whenever `server/swagger.js` changes; the generated file is committed so CI needs no extra step.

## Records (`/api/records`)
| Method | Path | Notes |
|---|---|---|
| GET | `/` | filters (`q` FTS5, status, type, workspace_id, page, limit) |
| GET | `/paged` | offset pagination `{ records, total, page, limit, totalPages }` |
| GET | `/:id` | workspace membership enforced |
| POST | `/` | requires editor role; duplicate code → 409 `DUPLICATE_CODE`; supports Idempotency-Key |
| PUT | `/:id` | editor role; version snapshot saved |
| DELETE | `/:id` | soft delete (`deleted_at`) |
| GET | `/check-code` | uniqueness check |
| GET | `/trash` | soft-deleted records |
| POST | `/bulk-delete` | scoped per-record membership check |

## Workspaces (`/api/workspaces`)
CRUD + membership management; role hierarchy `owner(10) > admin(8) > editor(5) > viewer(1)`.

## Other
- `custom-fields`, `api-keys`, `webhooks`, `notifications` — CRUD, auth-protected.
- `ai` — SSE proxy to Hermes agent, per-user rate limit (30/15min), workspace access validation, artifact interception.
- `artifacts` — AI-generated artifact download.

## WebSocket
Namespace `/`; events `record:created`, `record:updated`, `record:deleted` — all workspace-scoped.
