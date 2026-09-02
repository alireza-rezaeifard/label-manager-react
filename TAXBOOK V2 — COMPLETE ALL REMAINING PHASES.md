# TAXBOOK V2 — COMPLETE ALL REMAINING PHASES

You have already completed multiple modernization sessions on the `taxbook-v2` branch.

I have reviewed your latest verification report.

The current implementation is NOT complete.

Your own report explicitly shows that multiple phases are incomplete, several are partial/deferred, and the mandatory quality gate currently fails.

From this point forward:

## DO NOT STOP AFTER FIXING ONE ISSUE.

Your task is to continue working through EVERY remaining phase and EVERY remaining acceptance criterion from the original 52-section modernization prompt until the project is fully completed and all quality gates are GREEN.

Do not ask me which phase to do next.

You are authorized to continue through all phases.

---

# 1. CURRENT VERIFIED STATE

Your latest verification report says:

Frontend tests:

101/101 PASS

Backend tests:

57/57 PASS

Playwright:

12/12 PASS

Build:

PASS, but >500 kB chunk warnings remain

Lint:

FAIL

116 errors

284 warnings

Docker:

not yet verified

The report also identifies the following incomplete areas:

1. Frontend feature architecture not completed
2. TanStack Query only implemented as compatibility shim
3. Zustand not implemented
4. React Hook Form not implemented
5. Zod not implemented
6. Design system only partially modernized
7. Command palette missing
8. TanStack Table missing
9. TanStack Virtual missing
10. Frontend performance still has >500 kB chunks
11. Backend still has a ~1087-line index.js
12. PostgreSQL/Drizzle deferred
13. Authentication extras missing
14. Argon2id not implemented/evaluated
15. CSP still report-only
16. File upload hardening missing
17. Redis missing
18. BullMQ missing
19. Background jobs missing
20. Browser-level E2E coverage incomplete
21. Offline sync queue missing
22. Persian search normalization missing
23. Node 20 still used instead of Node 24
24. CI is red
25. modernization report is incomplete
26. repository contains junk/artifact files

See the latest verification report for exact details.

---

# 2. ABSOLUTE COMPLETION RULE

Do not interpret "deferred" as "done".

If a requirement was deferred because it was not currently justified, perform a proper engineering evaluation and document the decision.

However, you must still make the project satisfy the original acceptance criteria as closely as technically and operationally possible.

For infrastructure that is genuinely inappropriate for the current deployment model, implement the architecture in an extensible way and provide a production-ready integration path.

Do not simply leave:

"deferred"

without completing the engineering work around that decision.

---

# 3. FIRST PRIORITY — GREEN QUALITY GATE

Before adding new features:

Fix ALL lint errors.

Run:

npm run lint

Then:

npm run lint

again after every major refactor.

There must be:

0 errors

and ideally:

0 warnings.

Do not simply disable ESLint rules globally.

Do not add broad eslint-disable comments.

Fix the underlying problems.

Pay special attention to:

- `process is not defined`
- `{}` type issues
- setState inside effects
- empty blocks
- generated API type linting
- hooks violations
- unused imports
- unused variables
- unsafe types

If generated files should be excluded from linting, configure this intentionally and document why.

Do not hide real application errors by excluding source files.

---

# 4. COMPLETE FRONTEND FEATURE ARCHITECTURE

The report says:

- no `src/features/`
- no `src/app/`
- `App.tsx` remains ~72 KB

Fix this.

Refactor incrementally.

Target:

src/

  app/

  components/
    ui/
    layout/
    forms/
    feedback/
    data-display/

  features/
    dashboard/
    records/
    customers/
    products/
    workspaces/
    reports/
    import/
    export/
    authentication/
    settings/

  hooks/

  lib/

  services/

  schemas/

  types/

  utils/

Do NOT perform a blind mass file move.

Identify logical boundaries first.

Break `App.tsx` into focused modules.

The final App.tsx should primarily be responsible for application composition and routing.

Do not change business behavior.

Run tests after each extraction.

---

# 5. COMPLETE TANSTACK QUERY MIGRATION

The current implementation is only a compatibility layer.

Do NOT stop there.

Gradually migrate actual feature code from:

`useSWR`

to idiomatic:

- `useQuery`
- `useMutation`
- `useInfiniteQuery` where appropriate

Use query keys consistently.

Implement:

- caching
- invalidation
- staleTime
- retry strategy
- optimistic updates where safe
- mutation error handling
- pagination
- background refresh

Remove the compatibility layer only after all consumers are migrated.

Do not break existing API behavior.

---

# 6. ZUSTAND — USE ONLY WHERE JUSTIFIED

Evaluate the current global client state.

If global UI state genuinely exists, introduce Zustand.

Good candidates:

- active workspace
- UI preferences
- command palette
- sidebar state
- selected rows
- temporary UI state
- keyboard shortcuts

Do NOT move server state into Zustand.

TanStack Query remains responsible for server state.

If you conclude Zustand provides no benefit for a particular state, document that decision rather than adding meaningless stores.

---

# 7. REACT HOOK FORM + ZOD

Implement:

React Hook Form

+

Zod

for important frontend forms.

Start with:

- record/invoice form
- customer form
- product form
- workspace/settings forms

Create reusable schemas.

Validation must include:

- required fields
- data types
- ranges
- business constraints that belong on client
- user-friendly Persian error messages

Server validation must remain authoritative.

Do NOT trust frontend validation.

---

# 8. SERVER-SIDE SCHEMA VALIDATION

Implement proper schema validation for API:

- body
- query
- params

Use Zod or another strongly typed schema system.

Do not rely on manually scattered validation logic.

Create reusable validation schemas per module.

Normalize error responses through the existing API error envelope.

---

# 9. COMPLETE DESIGN SYSTEM

The current design system is only partially complete.

Finish it.

Use one coherent design system.

Preferred:

- Tailwind CSS 4
- shadcn/ui
- Base UI where appropriate
- Lucide
- Sonner
- Motion

Do NOT add another competing UI framework.

Do not introduce MUI, Chakra, Ant Design, etc.

Audit current Radix usage.

Where migration is safe and useful, move components toward Base UI/shadcn.

Where migration introduces unnecessary risk, keep the existing component and document why.

Create consistent:

- spacing
- typography
- radii
- borders
- shadows
- colors
- semantic states
- focus styles
- dark mode
- light mode
- RTL behavior

Create reusable design tokens.

---

# 10. COMMAND PALETTE

Implement a real command palette.

Required shortcut:

Ctrl + K

Cmd + K on macOS.

Commands:

- create record/invoice
- search records
- search customer
- search product
- create customer
- create product
- open reports
- open settings
- switch workspace
- toggle theme

It must support:

- keyboard navigation
- focus management
- accessibility
- Persian text
- fuzzy search where appropriate

Add Playwright coverage.

---

# 11. TANSTACK TABLE + TANSTACK VIRTUAL

Replace legacy table/virtualization architecture where beneficial.

Use:

TanStack Table

+

TanStack Virtual

for large datasets.

Implement:

- sorting
- filtering
- pagination
- column visibility
- column resizing
- row selection
- bulk actions
- sticky columns
- keyboard navigation
- virtualization
- responsive behavior

Do not load thousands of rows unnecessarily.

Maintain server-side filtering/pagination where appropriate.

Do not break current table behavior.

---

# 12. FRONTEND PERFORMANCE

The build still reports chunks >500 kB.

Investigate the actual cause.

Do not blindly increase chunk warning limits.

Use:

- route-level lazy loading
- dynamic imports
- dependency analysis
- tree shaking
- proper chunk splitting
- lazy chart loading
- lazy export/import modules

Measure before/after.

Produce a bundle report.

Target meaningful reductions in initial JS.

Document any unavoidable large chunks.

---

# 13. BACKEND MODULARIZATION

Current `server/index.js` is still approximately 1087 lines.

Finish the refactor.

Target:

server/src/

  app.ts

  server.ts

  config/

  db/

  modules/

    auth/

    users/

    workspaces/

    records/

    customers/

    products/

    reports/

    imports/

    exports/

    files/

    activity/

  middleware/

  websocket/

  lib/

Each feature should have clear separation between:

routes

controllers

services

repositories

schemas

types

Do not create abstraction for abstraction's sake.

Keep the application behavior unchanged.

After migration:

`server/index.js`

should be minimal or become a compatibility entrypoint only.

---

# 14. DATABASE — DO NOT PERFORM A BLIND MIGRATION

The current project uses SQLite.

SQLite may remain the default for:

- local installation
- offline mode
- single-node deployment

However, fully evaluate production PostgreSQL support.

If PostgreSQL is appropriate for production:

implement a clean PostgreSQL architecture.

Preferred:

PostgreSQL

+

Drizzle

But do not destroy SQLite support if offline/local functionality depends on it.

Create:

- schema mapping
- migrations
- migration tests
- seed strategy
- backup strategy
- compatibility documentation

If maintaining SQLite + PostgreSQL dual support is technically unsafe, document the exact boundary.

Do not fake PostgreSQL support.

---

# 15. DATABASE PERFORMANCE

Continue database optimization.

For important queries:

- run EXPLAIN QUERY PLAN / EXPLAIN ANALYZE
- identify slow queries
- add justified indexes
- test indexes
- remove redundant indexes

Audit:

- records
- customers
- products
- workspaces
- search
- reports

Avoid N+1 queries.

Do not add indexes without evidence.

---

# 16. AUTHENTICATION COMPLETION

Current refresh-token rotation and lockout are good.

Complete the remaining authentication requirements.

Implement where applicable:

- password reset
- email verification
- session/device management
- revoke individual session
- revoke all sessions
- session listing
- login audit

Access tokens should be reasonably short-lived.

Do not break existing sessions without a migration strategy.

---

# 17. ARGON2ID

Evaluate migration from bcryptjs to Argon2id.

Perform a compatibility-safe migration.

Preferred strategy:

- existing bcrypt password remains valid
- after successful login, transparently rehash using Argon2id
- new passwords use Argon2id
- eventually migrate all passwords

Do not invalidate all users' passwords.

Benchmark memory/time parameters.

Document the selected configuration.

---

# 18. CSP

CSP is currently report-only.

Complete staged rollout.

First:

- collect violations
- identify legitimate resources
- fix unsafe dependencies
- remove unnecessary inline scripts
- add nonces/hashes where necessary

Then move to:

Content-Security-Policy

enforcement.

Do NOT simply remove CSP because it causes errors.

Verify:

- login
- dashboard
- charts
- WebSocket
- PWA
- imports
- exports

after enforcement.

---

# 19. FILE UPLOADS

The previous audit says multer/sharp were removed as dead code.

Do NOT reintroduce them just because the original prompt mentioned them.

First inspect whether TaxBook currently needs file uploads.

If uploads are a real feature:

implement a hardened pipeline:

upload

→ size limit

→ MIME validation

→ extension validation

→ signature validation

→ safe filename

→ image processing if applicable

→ storage

→ authorization

If uploads are not currently part of the product:

document that and do not add dead infrastructure.

The requirement is secure upload architecture, not dependency accumulation.

---

# 20. REDIS

Evaluate Redis against the actual deployment architecture.

If Redis is required for:

- multi-instance WebSocket
- caching
- rate limiting
- queues

implement it cleanly.

Do not make Redis mandatory for local/offline development unless necessary.

Provide:

development fallback

production configuration

health checks

connection failure handling

---

# 21. BULLMQ / BACKGROUND JOBS

Implement a production-ready job architecture for genuinely expensive operations.

Candidates:

- large import
- Excel export
- PDF generation
- report generation
- image processing
- backups

Use:

BullMQ + Redis

if the deployment architecture supports it.

Create:

- queue definitions
- worker process
- retries
- backoff
- dead-letter/error handling
- job status
- cancellation where practical

Frontend should be able to display job progress/status.

Do not move trivial operations into jobs.

---

# 22. WEBSOCKET

Current WebSocket security is good.

Complete production readiness.

Verify:

- JWT authentication
- workspace authorization
- event validation
- reconnect
- duplicate events
- stale connections
- malformed payloads
- permission changes

If multiple backend instances are supported, implement Redis adapter.

If single-instance only, document the limitation.

---

# 23. OFFLINE / PWA

This is important.

The current PWA is preserved but lacks explicit sync queue architecture.

Implement:

offline mutation queue

with:

- local persistence
- pending status
- retry
- idempotency keys
- conflict handling
- server acknowledgement
- failed mutation state
- retry UI

Required lifecycle:

OFFLINE

↓

user mutation

↓

local pending mutation

↓

internet restored

↓

send mutation with idempotency key

↓

server acknowledgement

↓

mark synchronized

Do not duplicate records during retries.

Add tests.

---

# 24. PERSIAN SEARCH NORMALIZATION

Implement centralized Persian text normalization.

At minimum:

`ي → ی`

`ك → ک`

normalize Persian/Arabic digits

normalize zero-width characters

normalize half-space variants where appropriate

Use the normalized representation for search.

Do not corrupt original display text.

For PostgreSQL use appropriate indexing/search.

For SQLite FTS5 implement a compatible strategy.

Add unit tests with real Persian examples.

---

# 25. PAGINATION

Current bounded pagination is good.

Improve where justified.

Use:

- offset pagination for small datasets
- cursor pagination for very large datasets

Do not implement cursor pagination everywhere unnecessarily.

Ensure:

- stable ordering
- no duplicates between pages
- no missing records
- workspace isolation

---

# 26. API CONTRACT

Continue using OpenAPI.

Ensure all important endpoints have:

- request schemas
- response schemas
- error schemas
- authentication requirements
- permission requirements

Generated frontend types must remain synchronized.

CI should fail if generated API types are stale.

---

# 27. API UX

Keep:

- skeletons
- retry
- toast feedback

Add:

- consistent empty states
- error boundaries
- optimistic updates where safe
- proper mutation feedback

Do not overuse toast notifications.

---

# 28. ACCESSIBILITY

Complete WCAG 2.2 AA-oriented audit.

Check:

- keyboard navigation
- focus management
- dialogs
- forms
- tables
- command palette
- menus
- contrast
- reduced motion
- screen reader labels

Fix actual issues.

Add automated accessibility checks where practical.

---

# 29. BROWSER-LEVEL PLAYWRIGHT

Current Playwright coverage is mostly API-level.

Add real browser tests.

At minimum:

### Authentication

- login
- logout
- invalid login
- lockout behavior

### Dashboard

- load
- navigation
- workspace switching

### Records

- create
- edit
- delete
- restore
- filter
- pagination

### Customers

- create
- edit
- search

### Products

- create
- edit
- search

### Import/export

- UI flow
- success
- failure

### WebSocket

- synchronization
- reconnect

### Offline

- create mutation offline
- reconnect
- synchronization

### Responsive

- desktop
- tablet
- mobile

---

# 30. TEST COVERAGE

Maintain existing tests.

Target:

Frontend:
- unit
- component
- integration

Backend:
- unit
- API integration

E2E:
- browser

Do not chase meaningless percentage coverage.

Prioritize business-critical behavior.

---

# 31. NODE 24

Current report says Node 20 is still used.

Move production tooling to:

Node 24 LTS

Update:

- Dockerfiles
- GitHub Actions
- package metadata
- documentation

Then run the entire test suite under Node 24.

Do not leave mixed Node versions.

---

# 32. DOCKER VERIFICATION

Actually run the Docker build.

Do not report Docker as verified unless it has been tested.

Verify:

- build
- startup
- healthcheck
- non-root execution
- environment validation
- graceful shutdown
- API availability
- frontend availability if applicable

Fix any failures.

---

# 33. CI MUST BE GREEN

Run the actual CI-equivalent sequence locally:

npm ci

npm run lint

npm run test

npm run build

npm run test:e2e

server tests

Docker build

API type generation verification

security/dependency audit

The GitHub Actions workflow must pass.

Do not declare completion while CI is red.

---

# 34. REPOSITORY CLEANUP

Remove accidental artifacts identified in the report:

`src/components/TaxBookExportModal.tsx.tFcgf7rS.tmp`

Root junk:

`--clip`

`--clip=420 350 560 62`

`path/`

`Electronics_books_template (1).xlsx`

Server DB artifacts:

`data.db.bak`

`test-data.db.recovered`

`e2e-data.db*`

BUT:

Before deleting anything, verify whether each file is required.

Do not delete legitimate fixtures or migration assets.

Update `.gitignore` appropriately.

---

# 35. DOCUMENTATION

Update ALL docs after implementation.

Required:

docs/architecture-audit.md

docs/architecture.md

docs/api.md

docs/database.md

docs/security.md

docs/deployment.md

docs/performance.md

docs/testing.md

docs/modernization-plan.md

docs/modernization-report.md

The documentation must describe the FINAL repository state.

Do not leave documentation describing old architecture.

---

# 36. FINAL MODERNIZATION REPORT

Replace the current incomplete modernization report with a final report.

It must contain:

## Executive summary

## Before/after architecture

## Frontend modernization

## Backend modernization

## Database

## Authentication

## Security

## Performance

## PWA/offline

## WebSocket

## Testing

## CI/CD

## Docker

## Dependency changes

## Migration notes

## Remaining technical debt

If something remains intentionally deferred, explicitly explain:

- why
- evidence
- risk
- trigger for implementation
- exact future implementation path

Do not simply write "deferred".

---

# 37. PERFORMANCE MEASUREMENTS

Do not make unsupported claims.

Measure:

- production build size
- initial JS
- route chunks
- API latency
- important DB query latency
- large table rendering
- search latency

Record before/after measurements where possible.

---

# 38. SECURITY VERIFICATION

Perform another security audit after implementation.

Specifically test:

- IDOR
- workspace isolation
- authentication bypass
- authorization bypass
- JWT abuse
- refresh token reuse
- brute force
- file upload
- path traversal
- XSS
- SQL injection
- CORS
- CSP
- sensitive logs
- rate limits

Add regression tests for every real vulnerability discovered.

---

# 39. NO REGRESSIONS

Preserve all existing functionality.

Especially:

- Persian RTL
- Jalali dates
- Persian digits
- records
- customers
- products
- workspaces
- RBAC
- import
- export
- reports
- printing
- PWA
- offline
- WebSocket
- authentication

Do not trade existing functionality for architectural cleanliness.

---

# 40. COMMIT STRATEGY

Continue using logical conventional commits.

Examples:

fix: resolve lint violations

refactor: split application shell

feat: migrate records to tanstack query

feat: add command palette

feat: modernize data tables

feat: add form validation schemas

security: enforce content security policy

security: migrate passwords to argon2id

feat: add offline mutation queue

feat: add background jobs

chore: upgrade runtime to node 24

test: add browser e2e coverage

docs: finalize modernization report

Do not squash everything into one giant commit.

---

# 41. IMPORTANT DECISION RULE

Do not install libraries just because they appear in the original prompt.

For every new dependency, ask:

1. Does the project need it?
2. Does it solve an existing problem?
3. Is it actively maintained?
4. Is it compatible with the existing architecture?
5. Does it increase bundle size?
6. Does it create duplication with an existing dependency?

If not justified, do not add it.

---

# 42. IMPORTANT FINANCIAL APPLICATION RULE

This is TaxBook.

Never change financial/business semantics simply during refactoring.

Before touching:

- record totals
- financial calculations
- taxes
- dates
- numbering
- permissions
- workspace ownership

create regression tests first.

Architecture modernization must not alter business behavior.

---

# 43. DEFINITION OF DONE

You are NOT finished when:

- tests pass
- build passes

You are finished only when ALL applicable acceptance criteria from the original 52-section prompt have been addressed.

Final quality gate must be:

Frontend tests: PASS

Backend tests: PASS

Playwright browser tests: PASS

Lint: PASS

Build: PASS

API type generation: PASS

Docker build: PASS

Security audit: PASS

Dependency audit: PASS

No accidental repository artifacts

Documentation updated

CI GREEN

No known critical/high security issues

No known broken core workflows

---

# 44. FINAL VERIFICATION REPORT

At the very end create:

`docs/final-verification-report.md`

Include a table:

| Phase | Requirement | Status | Evidence |
|---|---|---|---|

Statuses may be:

DONE

PARTIAL

NOT APPLICABLE

But:

Do not use PARTIAL for something you simply did not implement.

For every PARTIAL item, explain exactly what remains.

The objective is to minimize PARTIAL/NOT APPLICABLE items through actual implementation.

---

# 45. CONTINUE AUTONOMOUSLY

Do not stop after:

- fixing lint
- adding command palette
- splitting App.tsx
- adding forms
- adding tables

Those are only individual phases.

Continue until the entire modernization program is complete.

If a task requires multiple sessions, continue in logical commits and maintain:

`docs/modernization-progress.md`

with:

- completed work
- current work
- remaining work
- tests
- blockers

When one phase is complete, immediately proceed to the next applicable phase.

Do not ask the user which phase to choose.

---

# 46. FINAL RESPONSE TO USER

When everything is complete, report:

1. What was implemented
2. What was intentionally not implemented
3. Why
4. Test results
5. Build result
6. Docker result
7. Security result
8. Performance measurements
9. Remaining technical debt
10. Git commits created

Do not claim 100% completion if any mandatory acceptance criterion remains unresolved.

Start now.

First fix the failing lint/CI gate, then proceed sequentially through ALL remaining phases until the final verification report is complete.