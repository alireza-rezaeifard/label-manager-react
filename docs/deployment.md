# TaxBook — Deployment

## Topology (docker-compose)
- `label-studio` — backend (build `Dockerfile`): builds the frontend then serves it alongside the API on :3001.
- `frontend` — nginx-only static serving (build `Dockerfile.frontend`, config `nginx.conf`) on :80.
- `hermes` — AI agent sidecar on :3002.

## Backend image
- Multi-stage build; runtime runs as non-root user `appuser` (uid 1001).
- `HEALTHCHECK` hits `GET /api/version` every 30s.
- `STOPSIGNAL SIGTERM`; the server drains connections and closes the DB checkpoint timer on shutdown.
- Data volume `label-studio-data` mounts at `/app/server` — must stay writable by uid 1001.

## Required environment (validated at boot; production fails fast)
| Var | Required | Notes |
|---|---|---|
| `JWT_SECRET` | yes (prod) | ≥32 chars |
| `JWT_EXPIRES_IN` | no | default `12h` |
| `ALLOWED_ORIGINS` | recommended | comma-separated origins |
| `PORT` | no | default 3001 |
| `NODE_ENV` | yes (prod) | `production` |
| `HERMES_URL` | no | AI agent endpoint |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | no | seed credentials |

## Deploy checklist
1. `JWT_SECRET` set and strong; `ALLOWED_ORIGINS` matches the public origin.
2. Volume writable by uid 1001.
3. Health check green (`/api/version`).
4. Backups directory on a persistent volume.
5. Run `docker compose up -d --build`; watch logs for `Invalid configuration` warnings.
