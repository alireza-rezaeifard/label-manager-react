# TaxBook — Performance

## Frontend
- Route-level code splitting: all pages/modals lazy-loaded (`React.lazy`).
- Vendor chunks (`vite.config.js`): `vendor-react` (~70 KB gz), `vendor-charts` (~164 KB gz, loaded only on dashboard/reports), `vendor-export` (~374 KB gz, loaded only on export/print).
- Lists virtualized with `react-window`; skeletons instead of spinners.
- Known hot spots (measure before optimizing): `App.tsx` context width, dashboard chart mounts.

## Backend
- Prepared statements everywhere; FTS5 for search instead of `%LIKE%`.
- Payload bounds: records list hard cap 1000 rows, default 200.
- Baseline (local, Windows): full build ~2s; backend test suite ~1.3s; frontend test suite ~5s.
- Measured targets (to be validated with profiling in Phase 4/5): p95 list endpoints < 100 ms at 100k records; initial JS < 300 KB gz.

## Database
- WAL journaling + periodic checkpoints keep write latency stable.
- Index additions require `EXPLAIN QUERY PLAN` evidence (see `database.md`).

## Do not
- Add memoization without a measured render cost.
- Load unbounded collections into the client.
- Cache without a TTL and invalidation strategy.
