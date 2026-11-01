# Testing

Every kind of automated test in this repo, what runs it, and where it lives.
Each app owns its tests in its own `testing/` folder (it has its own port,
Supabase auth project and deploy); shared-package tests stay in their package.

| Kind | Tool | Where | Command (repo root) |
|---|---|---|---|
| Unit + component | Vitest, Testing Library, jsdom | `apps/*/testing/unit`, `packages/*/src/*.test.ts` | `npm run test` |
| Contract | Vitest | `apps/*/testing/contracts` | `npm run test:contract` |
| Integration | Vitest + real Postgres | `apps/*/testing/integration` | `npm run test:integration` |
| Database migration | Vitest + Prisma CLI + real Postgres | `packages/database/testing` | `npm run test:migrations` |
| UI / end-to-end | Playwright | `apps/*/testing/e2e/*.spec.ts` | `npm run test:e2e` |
| API | Playwright `request` | `e2e/api.spec.ts`, `e2e/access.spec.ts` | (part of `test:e2e`) |
| Smoke | Playwright, `@smoke` | tagged tests across `e2e/` | `npm run test:smoke` |
| Sanity | Playwright, `@sanity` | `e2e/sanity.spec.ts` | `npm run test:sanity` |
| Security | Playwright `@security` + CI scanners | `e2e/security.spec.ts`, `.github/workflows` | `npm run test:security` |
| Accessibility | axe-core (`@axe-core/playwright`), `@a11y` | `e2e/a11y.spec.ts` | `npm run test:a11y` |
| Visual regression | Playwright `toHaveScreenshot`, `@visual` | `e2e/visual.spec.ts` + `e2e/__screenshots__/<os>/` | `npm run test:visual` |
| Responsive | Playwright, `@responsive` | `apps/web/testing/e2e/responsive.spec.ts` | `npm run test:responsive --workspace=web` |
| Cross-browser | Playwright: Firefox, WebKit, iPhone, iPad, Android tablet | `testing/playwright.cross-browser.config.ts` | `npm run test:cross-browser` |
| Page performance | Lighthouse CI (`@lhci/cli`) | `apps/web/testing/performance` | `npm run test:perf` |
| Load | autocannon | `apps/web/testing/load` | `npm run test:load` |
| Regression | all of the above, on every PR | `.github/workflows` | — |

Per app, the same scripts exist with `--workspace=web` / `--workspace=admin`,
plus `test:watch` and `test:visual:update`. Playwright flags pass through
after `--`: `npm run test:e2e --workspace=web -- --ui`, `-- --headed`,
`-- -g "sign-up"`, `-- --project=mobile`.

## Layout

```
apps/web/testing/                  (apps/admin/testing/ is the same shape)
  tsconfig.json                    type-checks tests apart from the app, so a
                                   test can never break `next build`/a deploy
  vitest.config.ts                 unit + contract
  vitest.integration.config.ts     integration (real database)
  playwright.config.ts             e2e: desktop, mobile (web), visual, signed-in
  playwright.cross-browser.config.ts
  .env.e2e.example                 test-account credentials → copy to .env.e2e
  unit/  contracts/  integration/  e2e/  performance/ (web)  load/ (web)
packages/database/testing/         migration suite + the shared test-DB helper
.env.test.example                  TEST_DATABASE_URL → copy to .env.test
```

## First-time setup

```bash
npm install
npx playwright install chromium            # firefox webkit too for cross-browser
cp .env.test.example .env.test             # then set TEST_DATABASE_URL (below)
```

### The test database

Integration and migration tests **delete every row**, so they use their own
`TEST_DATABASE_URL` (from the shell or the repo-root `.env.test`) and refuse
anything that isn't `localhost` or that equals `DATABASE_URL`/`DIRECT_URL`.
Without it those suites skip.

The easiest local database needs no Docker and no password:

```bash
npm run db:test:start      # Prisma's local Postgres; prints the URL to put in .env.test
```

Any other local Postgres works too (`createdb storefront_test`). CI uses a
`postgres:17` service container. Integration tests run `prisma migrate deploy`
on it first; the migration suite drops and rebuilds the schema.

### Signed-in E2E tests

Put a dedicated test customer (storefront Supabase project) and a `SUPPORT`
test staff account (admin auth project) in `apps/<app>/testing/.env.e2e`.
Without them the `setup`/`signed-in` projects are left out and everything
else still runs. `testing/.auth/` holds the saved sessions (gitignored).

## How each kind works

**Unit / component.** Pure modules import through `@/` like the app does.
Component tests start with `// @vitest-environment jsdom` and query by role
and accessible name. Don't import the `@repo/database` root in a unit test —
it loads Prisma; use a fixture (`unit/pricing.test.ts`).

**Contract.** The two apps' only HTTP call (admin → storefront
`/api/revalidate`) is consumer-driven: admin owns
`apps/admin/testing/contracts/storefront-revalidate.contract.json` and checks
what it sends; web replays the same file against its route. Change the call
on one side and the other side's test fails. Razorpay's webhook is pinned the
same way, with a fixture of their `payment.captured` payload and their
signature scheme (`apps/web/testing/contracts/`).

**Integration.** Real Prisma against real Postgres; only the outside world
(email, the staff session, Next's request scope) is stubbed with `vi.mock`.
Covers order settlement (idempotency, replayed payments, cancelled orders),
stock (rollback, last-copy race) and admin Server Actions (role gate, audit
log). Each test starts from an empty database (`resetTestDatabase`).

**Migrations.** From an empty database: every migration applies, `migrate
status` is clean, `schema.prisma` has no drift from the migrations, the Data
API roles (`anon`/`authenticated`) get no access beyond their RLS'd reads,
seeding works twice, and a second deploy is a no-op. CI also fails a PR that
edits an already-merged migration or adds one that sorts before the newest.

**E2E / API / smoke / sanity.** Locally Playwright starts (or reuses) the dev
server; in CI it builds and serves the production app. `E2E_WEB_URL` /
`E2E_ADMIN_URL` point it at a deployment instead (and `E2E_VERCEL_BYPASS`
gets through Vercel Deployment Protection). Everything must pass on an empty
catalogue; product-dependent checks skip themselves.

**Security.** In-browser: security headers, CSP (nonce, no inline script, no
`unsafe-eval` in production builds), reflected-XSS, open-redirect and
path-encoding probes, webhook/upload/download endpoints refusing anonymous or
forged calls. In CI: `npm audit`, gitleaks and CodeQL (`security.yml`) on
every push, and an OWASP ZAP baseline scan of each deployment
(`post-deploy.yml`, report-only for now; rules in `.github/zap-rules.tsv`).

**Accessibility.** axe-core, WCAG 2.1 A/AA, on every public page (light and
dark), plus a keyboard-only sign-in. Serious/critical violations fail;
minor ones are attached to the report. Issues that existed when the suite was
added are listed in `e2e/support/a11y.ts`'s `KNOWN_VIOLATIONS` — fix them and
delete the entry; anything new fails.

**Visual regression.** Screenshots of CMS-independent screens (sign-in,
sign-up, empty cart, 404; light + dark) compared pixel-for-pixel. Baselines
are per OS (`__screenshots__/win32`, `/linux`): a missing baseline is
recorded on first run, so the first CI run uploads `visual-baselines-linux-*`
as an artifact — commit those files to start comparing in CI. After an
intended change: `npm run test:visual:update --workspace=web`, review, commit.

**Responsive / cross-browser.** `@responsive` checks five widths (320–1920px)
for sideways scrolling and the right navigation. Known layout bugs use
`test.fail()` (`KNOWN_OVERFLOW`) so CI stays green until the fix, then goes
red to remind you to delete the entry. The cross-browser config runs smoke,
sanity and responsive on Firefox, Safari/WebKit, iPhone, iPad and an Android
tablet — nightly in CI. (Locally on Windows, Playwright's Firefox needs the
Microsoft Visual C++ Redistributable.)

**Performance.** Lighthouse CI audits four pages three times each on a
throttled mid-range phone. Hard budgets: accessibility ≥ 0.9, CLS ≤ 0.1.
Soft (warn) budgets: performance ≥ 0.8, LCP ≤ 2.5s, TBT ≤ 300ms. Locally it
builds and serves on :3100; after each deploy CI audits the live URL. Reports
go to `testing/performance/reports/` (gitignored, never uploaded).

**Load.** autocannon drives the homepage, books listing, catalogue API and a
policy page (default 20 connections × 20s each, `LOAD_CONNECTIONS` /
`LOAD_DURATION`), after a warm-up, against p99-latency and error-rate
budgets. 429s are reported apart from errors — one IP trips the rate limiter
by design. Run it against a production build or staging, **never
production**; non-local targets need `--confirm-remote`.

## CI/CD

| Workflow | When | What |
|---|---|---|
| `security.yml` | push, PR, weekly | typecheck, lint, unit + contract tests; npm audit; gitleaks; CodeQL |
| `ci.yml` | push, PR | migrations + integration (Postgres service); E2E per app incl. a11y, visual, security, API |
| `nightly.yml` | 03:00 IST, manual | cross-browser and device matrix |
| `post-deploy.yml` | each successful Vercel deployment | smoke/sanity/security on the live URL, ZAP baseline, Lighthouse |
| `load-test.yml` | manual | load test against a staging URL you enter |
| `db-migrate.yml` | manual | `prisma migrate deploy` to staging or production (GitHub environment approval) |

Deploys themselves stay with Vercel's Git integration (a preview per PR,
production from `main`); these workflows gate and verify them.

Repository secrets they read (each job skips cleanly without its secrets):

- `WEB_ENV_FILE`, `ADMIN_ENV_FILE` — the full `.env.local` for each app,
  pointing at **staging** (staging Supabase, Razorpay test keys).
- `E2E_CUSTOMER_EMAIL`/`_PASSWORD`, `E2E_STAFF_EMAIL`/`_PASSWORD` — optional
  test accounts.
- `VERCEL_AUTOMATION_BYPASS_SECRET` — Vercel → project → Deployment
  Protection → Protection Bypass for Automation.
- Environments `staging` and `production`, each with a `DIRECT_URL` secret,
  for `db-migrate.yml`; give `production` required reviewers.
