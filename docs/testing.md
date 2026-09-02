# TaxBook — Testing

## Stack
- Frontend: Vitest + Testing Library (jsdom). Config in `vite.config.js` — `include` restricted to `src/**` so vendored dependencies are never collected.
- Backend: Vitest + Supertest against the real Express app (`server/__tests__/`), needs `JWT_SECRET` env.
- CI: `.github/workflows/ci.yml` — lint, frontend tests, build, backend tests, npm audit, Docker builds on main/taxbook-v2.

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

## Planned (Phase 10)
Playwright E2E: login, workspace isolation, record CRUD, import/export, offline recovery, WebSocket reconnect.
