# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Digital Storefront for Shashibhushan's New School Book Press: physical/digital
book sales, e-book creation services, and a self-publishing portal. npm
workspaces + Turborepo monorepo containing two independently deployed
Next.js 16 apps (`apps/web`, `apps/admin`) that share code via
`packages/*` but never call each other at runtime — they only share a
Supabase Postgres database. See `apps/web/CLAUDE.md` and
`apps/admin/CLAUDE.md` for app-specific commands and architecture.

This is a Phase 0 scaffold, not a finished app — check README.md's "What's
real vs. what's a stub" section before assuming a feature is implemented.
Full HLD/LLD/data model/system design lives in
`docs/Digital_Storefront_Technical_Design_Document_v1.1.docx`; consult it
before making architectural changes.

## Workflow

**Never create a git worktree or work inside one.** Always work directly in
this checkout on the `main` branch — don't create feature branches or
switch away from `main` either. This overrides any default to branch or
isolate work before committing.

## Commands

Run from the repo root unless noted. This repo uses **npm workspaces**, not pnpm/yarn.

```bash
npm install                              # installs and links all workspace packages
npm run dev                              # both apps in parallel (web :3000, admin :3001)
npm run dev:web                          # apps/web only
npm run dev:admin                        # apps/admin only
npm run build                            # turbo build, both apps
npm run lint                             # turbo lint, both apps
npm run typecheck                        # turbo typecheck, both apps
```

Tests (full guide: `docs/testing.md`): `npm run test` runs Vitest unit +
contract tests everywhere. `test:integration` and `test:migrations` need a
throwaway local Postgres in `TEST_DATABASE_URL` (`npm run db:test:start`).
`npm run test:e2e` runs each app's Playwright suite (starting or reusing its
dev server); `test:smoke` / `test:sanity` / `test:security` / `test:a11y` /
`test:visual` / `test:cross-browser` run subsets; `test:perf` (Lighthouse)
and `test:load` (autocannon) are storefront-only. Each app keeps its tests in
its own `testing/` folder, type-checked by `testing/tsconfig.json` and
excluded from the app's tsconfig so a test can't break `next build`. CI/CD
workflows are in `.github/workflows` (see the guide).

Database (all proxy into `packages/database`'s Prisma scripts):

```bash
npm run db:generate                      # regenerate the Prisma client — do this after any schema.prisma change
npm run db:migrate                       # prisma migrate dev, against Supabase
npm run db:studio                        # prisma studio
npm run migrate:deploy --workspace=@repo/database
npm run seed --workspace=@repo/database  # seeds CMS defaults + one sample service package (book catalogue is empty for the testing phase)
```

To run any script in a single workspace directly: `npm run <script> --workspace=<name>` (app names are `web`/`admin`; package names are `@repo/database`, `@repo/auth`, etc.).

Each app needs its own `.env.local`, copied from that app's own `.env.example`
(`apps/web/.env.example`, `apps/admin/.env.example` — deliberately different
lists, e.g. only `web` gets `NEXT_PUBLIC_RAZORPAY_KEY_ID`, only `admin` gets
`SUPABASE_SERVICE_ROLE_KEY`) before `dev`/`build` will connect to anything
real. The Prisma CLI (`db:generate`/`db:migrate`, run via `packages/database`)
reads its own `packages/database/.env`, copied from
`packages/database/.env.example`, since it runs as a separate process outside
either app's Next.js env loading.

## Architecture

**Two standalone apps, one shared data layer.** The monorepo exists only
to share source code — `packages/database`, `packages/auth`,
`packages/payments`, `packages/storage`, `packages/email`,
`packages/cache`, `packages/ui`, `packages/config` — between `apps/web` (public storefront +
customer account area) and `apps/admin` (internal back office, staff-only).
Each app has its own `package.json`, `next.config.ts`, port, and is meant
to deploy as its own Vercel project (Root Directory = `apps/web` or
`apps/admin`). Neither app imports from the other.

**`packages/database` is the single source of truth for the data model.**
`prisma/schema.prisma` mirrors the BRD's entities one-to-one (User,
Product, Order/OrderItem, SelfPublishingProject, ServiceRequest, Royalty,
Review, Payment, FileAsset, Notification, AuditLog), plus the CMS tables
`apps/admin` writes and `apps/web` reads (SiteSettings, NavLink, Banner,
Faq, Testimonial, ContentBlock, PricingSettings, ClassSetTier,
DiscountCode). Both apps import the same Prisma client singleton from
`packages/database/src/client.ts`. After editing `schema.prisma`, run
`npm run db:generate` before either app will typecheck against the new
shape.

Two non-Prisma modules sit alongside it and are re-exported from
`client.ts`: `src/content.ts`, the registry of every editable storefront
string with its label, help text and default copy, and `src/pricing.ts`,
the shape and defaults of the admin-managed pricing rules. Both are pure
data — no Prisma import — so their *types* can be used from Client
Components. Their readers (`getContent()`, `getPricingConfig()`) swallow
database errors and fall back to the shipped defaults, deliberately: a
storefront rendering last-known-good copy beats one that 500s because a
settings row is missing.

**Product & service taxonomy — business structure, not schema structure.**
The Press sells across 5 departments (8 product lines total) plus a
Publishing department of 2 services:

- **Educational Materials** — Books (physical/e-book), Educational Charts,
  Worksheets and Activity Puzzles, Teaching and Learning Materials
- **Professional Materials** — Advocate's Diary (Naya Bandhu)
- **Digital & Tech Solutions** — Naya Bandhu (Application), Digital
  Tracking System
- **Lifestyle** — Indoor Plants (Chatterjee's Green Veranda)
- **Publishing** (services, not products) — Self Publishing, Bulk
  Publishing

The 8 product lines are now schema-backed: `Product.productLine` is a
nullable `ProductLine` enum (`packages/database/prisma/schema.prisma`),
one value per line above (`BOOK`, `EDUCATIONAL_CHART`, ...), separate from
`Product.type` (`PHYSICAL_BOOK`/`EBOOK`/`SERVICE_PACKAGE`), which still only
encodes fulfillment mechanics. It's null for `SERVICE_PACKAGE` rows outside
this taxonomy (e.g. the e-book conversion packages sold from `/services`)
and, today, for every product line except Books — see below. The canonical
labels/departments/slugs for all 8 lines (plus the 2 Publishing services,
which are deliberately *not* `ProductLine` values since they're never
`Product` rows — see `ServiceRequest`/`SelfPublishingProject`) live in
`packages/database/src/taxonomy.ts`, re-exported from `client.ts` the same
way `content.ts`/`pricing.ts` are.

**This taxonomy module isn't consumed yet, so it's a second source of
truth, not a replacement for the first.** `FIXED_DEPARTMENTS` in
`apps/admin/components/sidebar-nav.tsx` and `buildDepartments()` in
`apps/web/lib/navigation.ts` still hardcode their own literal copy of the
same labels/hrefs (kept in sync by hand, since the two apps never import
from each other — see below) rather than importing `PRODUCT_LINE_CATALOG`
from `@repo/database`; wiring them up is follow-up work, not done here.
The only schema-backed category system besides `ProductLine` is
`MenuCategory`/`MenuProduct`, and that's for *additional* categories an
operator creates from `apps/admin`'s Menu section, layered on top of these
5 fixed departments rather than modeling them. In practice four of the
eight product lines now have a real admin CMS backed by `Product`:
**Books** (`apps/admin/app/educational-material/books`, the fullest one —
formats, genre, e-book fields, service packages) and the three simpler
Educational Materials lines — **Educational Charts**, **Worksheets and
Activity Puzzles**, **Teaching and Learning Materials** — which share one
trimmed-down list/form/actions set in
`apps/admin/app/educational-material/_shared/`, each route folder passing
its own `ProductLineConfig`. Every one of these writes `Product.productLine`
(Books always `"BOOK"`; the other three their own enum value), and the
Books list/detail — in both apps — filter to `productLine: "BOOK"` so the
`PHYSICAL_BOOK`-typed charts/worksheets/materials don't leak in. The
remaining four product-line pages and both service pages are still
`EmptyState` stubs (see `apps/admin/CLAUDE.md`'s "Route map"); giving one
real inventory now only needs a route folder like the three simple lines'
— read/write `Product` filtered by its `ProductLine` value.

**A book's formats are `BookEdition` rows, not columns.** A title is sold
in any one, two or all three of Paperback / Hardcover / E-book — one
`BookEdition` (format, price, printed-copy stock) per format, unique per
`(productId, format)`. `Product.priceCents` on a book is a denormalised
copy of its cheapest edition (the storefront listing sorts on it);
`Product.stockQty` is null on a book. Cart/checkout line ids are
`<productId>:paperback|hardcover|ebook` (`bookLineId`/`parseLineId` in
`packages/database/src/book-formats.ts`), checkout prices each line from
its edition, and `OrderItem.bookFormat` / `PurchaseOrderItem.bookFormat`
record which edition a line was for. Non-book products have no editions.

**Auth is Supabase Auth, wrapped by `packages/auth`.** `src/server.ts`
(Server Components/Actions), `src/client.ts` (Client Components), and
`src/middleware.ts` (a middleware *factory* — each app's `proxy.ts`
calls `createAuthMiddleware()` with its own options; `apps/admin` passes
`allowedRoles: ADMIN_ROLES` to lock the whole app down, `apps/web` doesn't).
Role authorization is checked twice by design: loosely in proxy (a UX
redirect, not a security boundary) and again inside every Server Action via
`assertRole()` from `packages/auth/src/roles.ts`. Never rely on proxy
alone to protect a mutation. Sessions are verified with `getClaims()`, not
`getUser()` — both auth projects sign with ES256, so that's a local JWKS
check instead of an HTTP round trip per call — and `getCurrentUser()` /
`getCurrentStaff()` are React-`cache()`d per request; see
`getSessionIdentity()` in `packages/auth/src/server.ts` for the trade-off.

**The two apps authenticate against two separate Supabase projects.** A
storefront customer signs up worldwide and self-service; a staff account
must be impossible to create that way, so `apps/admin` points its auth at
its **own** Supabase project — `NEXT_PUBLIC_AUTH_SUPABASE_URL` /
`NEXT_PUBLIC_AUTH_SUPABASE_PUBLISHABLE_KEY` (resolved in
`packages/auth/src/env.ts`, falling back to `NEXT_PUBLIC_SUPABASE_*` when
unset, which is how `apps/web` keeps using the storefront project). Only
`apps/admin`'s *auth endpoint* moves: its `DATABASE_URL` still points at
the shared storefront Postgres for all business/CMS data, and its
`NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` still point at the
storefront project for `packages/storage` image uploads. Setup for the
admin project lives in `docs/setup/admin-auth-project.sh` (wizard) +
`packages/database/prisma/sql/sync_staff.sql`.

Each project keeps its own `public.users` in sync with its `auth.users` via
a Postgres trigger run manually in that project's SQL editor (Prisma
doesn't manage the `auth` schema): `sync_user.sql` for the storefront
project (also defines the starter RLS policies), `sync_staff.sql` for the
admin project (a trimmed `users` table + trigger + self-read RLS — that
project has no other Prisma-managed schema). Everyone lands as `READER` by
default in both — nobody signs up into a staff role, and a `READER` row in
the admin project still can't pass `createAuthMiddleware`'s `ADMIN_ROLES`
gate. `apps/web` reads a customer's role/profile with Prisma
(`getCurrentUser()`); `apps/admin` reads a staff member's role from its
auth project over Supabase REST (`getCurrentStaff()` and the middleware
role check) because its Prisma client can't see that project's DB.
`apps/admin` is the only place `SUPPORT`/`EDITOR`/`OWNER` is assigned, and
only the Owner can do it; see "Staff access is Owner-granted" in
`apps/admin/CLAUDE.md` for the invite/promote/revoke design (not yet built
— `settings/roles` is still read-only).

**`AuditLog.actorId` is a bare `@db.Uuid`, not an FK.** It holds a staff
UID from the admin auth project, which has no row in the storefront
`users` table; `actorEmail` is denormalised next to it for legibility.

**An order's printed part has its own status.** `Order.shipmentStatus`
(null when nothing ships) runs AWAITING_APPROVAL → PROCESSING → SHIPPED →
OUT_FOR_DELIVERY → DELIVERED, or → CANCELLED, moved by staff from
`apps/admin`'s Sales Orders page; `Order.status` keeps tracking payment and
the order as a whole, so a mixed order's parcel can be refused while its
e-book stays delivered. Steps, labels and the online/offline split live in
`packages/database/src/shipment.ts` (Client-Component-safe via
`@repo/database/shipment`), used by both apps. The stock helpers
(`takeStock`/`returnStock`) live in `packages/database/src/stock.ts` for the
same reason — checkout takes copies, a denied sales order returns them.

**Payments run through `packages/payments` (Razorpay).** Order status is
only ever flipped to `PAID` by the signature-verified webhook at
`apps/web/app/api/webhooks/razorpay/route.ts` — the client-side redirect
after checkout is never trusted as the source of truth.

**There is no background-job queue — the project opted out of Inngest.**
Notifications are sent directly with `packages/email` helpers, inside
`after()` when the caller shouldn't wait (e.g. COD checkout) and always
best-effort: an email failure is logged, never thrown, and never retried
(see `sendOrderConfirmationEmail` in `apps/web/lib/orders.ts`). Anything
that genuinely needs retries or delays (e.g. expiring abandoned `PENDING`
orders) needs a Vercel Cron route or a queue chosen at that point.

**Caching is data-level, tag-invalidated, and goes through `packages/cache`.**
The decision record is `docs/adr/0001-caching-strategy.md`; read it before
changing anything cached.

Storefront pages always render on request, because the nonce CSP rules out
ISR and Partial Prerendering. What's cached is the data they read.

**Rules for new code:**
- **Reading.** Every cached server read goes through `cachedQuery()`
  (`@repo/cache/query`), never `unstable_cache` directly. It dedupes per
  request, coalesces concurrent misses, tags the entry and records metrics.
- **Tags.** They come from `@repo/cache/tags`: an umbrella (`cms` /
  `catalogue`) plus narrow ones (`cms:faqs`, `catalogue:BOOK`,
  `product:<slug>`).
- **Writing.** A write expires only what it changed, via the event
  builders (`cmsChangedTags`, `productChangedTags(before, after)`,
  `stockTakenTags`, `stockReturnedTags`):
  - in apps/admin, through `revalidateStorefront(tags, productIds)`;
  - in apps/web, through `revalidateTag(tag, { expire: 0 })`.
- **TTLs** in `@repo/cache/policy` are only a backstop (5 minutes for
  shoppers).

**Where the cache lives.** With `CACHE_STORE=redis` (set before the build;
production on Hostinger), the storefront's data cache is in Upstash Redis
through `apps/web/cache-handler.mjs`. Admin then writes invalidations
straight into it, as well as pinging `/api/revalidate`. Unset, it's Next's
built-in per-process cache.

**Never cached:** checkout pricing and stock checks, discount codes,
per-user data, the session and staff role.

**File uploads go through `packages/storage` (Vercel Blob)** using a
staging → malware-scan → promote pattern. The scan itself
(`scanUpload()` in `packages/storage/src/scan.ts`) calls Cloudmersive and
fails closed — `PENDING` without `CLOUDMERSIVE_API_KEY` — but nothing calls
it yet; the caller records the result on `FileAsset` and owns any retry.
Admin image uploads (book covers, banner art) take a separate,
deliberately simpler path — `uploadImage()` straight to a public `images/`
prefix — because they come from a signed-in EDITOR/OWNER and are
type-checked by magic bytes at the route; see `apps/admin/CLAUDE.md`.

**Security rules live in `packages/security` and `docs/security-roadmap.md`.**
`@repo/security` holds the pure helpers both apps use: `safeNextPath`
(post-sign-in redirects), `isSafeHref`/`isHttpsUrl` (every CMS link/image
field, validated in admin schemas via `apps/admin/lib/schema-fields.ts` and
re-checked at render), the CSP/header builders used by each `proxy.ts` and
`next.config.ts`, `rateLimit` (Upstash Redis when configured), and
`securityEvent` (structured security logs). When adding code:
- a new `public` table is locked by the `lock_down_data_api` migration's
  default privileges and by `prisma/sql/auto_enable_rls.sql` — never grant
  `anon`/`authenticated` access; both apps use Prisma, not the Data API
  (`npm run check:data-api --workspace=@repo/database` verifies this);
- every Server Action / Route Handler validates input (zod) and re-checks
  auth itself; public or expensive endpoints get a `rateLimit`;
- anything that marks an order paid goes through
  `apps/web/lib/orders.ts`'s `settleOrderPayment`;
- no secret in a `NEXT_PUBLIC_*` variable — both apps' `instrumentation.ts`
  refuse to boot in production if one appears;
- `server-only` guards `@repo/auth/server`, `@repo/storage`,
  `@repo/payments` and `@repo/email`; keep them out of Client Components.

**Shared UI/config:** `packages/ui` holds the *behavioural* primitives
both apps share (Button, Sheet, DropdownMenu, Accordion + `cn()`);
`apps/web/components/primitives` holds the storefront's *presentational*
ones. `packages/config` carries the shared `tsconfig`, the ESLint flat
config, and the single set of Tailwind v4 design tokens in
`tailwind-preset.css`, which both apps' `globals.css` import — Swan
geometry with a palette sampled from `apps/web/public/logo*.svg`. See
`apps/web/CLAUDE.md` for what the tokens mean.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues (`tamajitghosh16/Digital-Storefront`), via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
