# TaxBook — Testing

## Stack
- Frontend: Vitest + Testing Library (jsdom). Config in `vite.config.js` — `include` restricted to `src/**` so vendored dependencies are never collected.
- Backend: Vitest + Supertest against the real Express app (`server/__tests__/`), needs `JWT_SECRET` env.
- E2E: **Playwright** (`playwright.config.ts`, `e2e/api/`) — API-level tests against a real server instance started by the config (`npm run test:e2e`), using an isolated SQLite file (`server/e2e-data.db`, gitignored). No browsers required. Covers: login, lockout, record CRUD, duplicate codes, idempotent creation, pagination caps, and workspace isolation.
- CI: `.github/workflows/ci.yml` — lint, frontend tests, build, backend tests, E2E, npm audit, Docker builds on main/taxbook-v2.

## Commands
```
npm test                  # frontend unit tests
npm run lint
npm run build
cd server && npm test     # backend API tests
```

## Conventions
- Tests for business rules (amount formatting, code parsing, exporters, keyboard shortcuts, hooks) live next to `src/__tests__/`.
- Regression tests must be written **before** changing any financial calculation, invoice numbering, date semantics or permission logic.
- Backend tests share one SQLite file — migrations and seeding are idempotent by design; keep it that way.

## Planned (Phase 10 remainder)
Browser-level Playwright flows (UI): dashboard, record form, import/export UI, offline mode, WebSocket reconnect. API-level E2E is implemented (see above).
