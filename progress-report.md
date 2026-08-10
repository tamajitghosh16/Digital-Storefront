# Digital Storefront — Codebase Progress Report

**Prepared:** August 8, 2026
**Method:** every route, page, Server Action, and package source file under `apps/web`, `apps/admin`, and `packages/*` was opened and read (78 app files, 31 package files — excluding `.next` build output and `node_modules`). Classification is based on what the code actually does, not on comments or the README's claims.

## Bottom line

This is Phase 0 of the roadmap in `README.md`, and further along than the README currently states in one area (auth) while matching it closely everywhere else. The data model, the admin back office, and the storefront's read side are genuinely built and working against Postgres. The customer-facing *write* side — pay, submit a manuscript, download a file — is not wired up yet. Every piece a checkout or wizard needs already exists in isolation (Razorpay adapter, webhook, Blob storage, Inngest jobs); none of it is connected to a button a customer can click.

Of the two apps, **admin is materially ahead of web**: every admin mutation I found (catalogue, banners, FAQs, testimonials, navigation, pricing, site settings) is a real, role-checked, audit-logged Server Action. Admin's read-only surfaces (orders, reviews, royalties, analytics, submissions, roles) say so themselves in code comments — "read-only for now" — so nothing there is a silent stub.

## Corrections to the README

- **Sign-in is real, not a stub.** Both `apps/web/app/sign-in/page.tsx` and `apps/admin/app/sign-in/page.tsx` have working Supabase email/password and Google OAuth flows. The README's "Stubbed" list still names this; it's out of date.
- **"All list/detail pages... run real Prisma queries" is true with one exception.** `apps/web/app/(account)/account/library/page.tsx` (the digital library) renders only `SAMPLE_LIBRARY_ITEMS` with a permanently `disabled` download button — no Prisma call at all. Every other list/detail page does query Prisma, with a graceful fallback to bundled sample data when the DB is unreachable or empty (`lib/safe-fetch.ts`'s `withFallback`).

## apps/web — customer storefront

### Real and working

| Area | File(s) | Notes |
|---|---|---|
| Homepage | `app/page.tsx` | Real Prisma queries (books, ebooks, banners, testimonials, FAQs) + `getContent()`, sample-data fallback only if DB unreachable |
| Books/E-books catalogue + detail | `books/page.tsx`, `books/[slug]`, `ebooks/page.tsx`, `ebooks/[slug]` | Real Prisma, genre/search/sort filtering, companion-price lookups |
| Services catalogue + detail | `services/page.tsx`, `services/[slug]` | Real Prisma |
| Sign-in/sign-up | `sign-in/page.tsx` | Real Supabase auth (email + Google OAuth) |
| Account → Orders | `account/orders/page.tsx` | Real Prisma, scoped to `getCurrentUser()` |
| Account → Publishing/Royalties | `account/publishing/page.tsx` | Real Prisma, role-gated to `SELF_PUB_AUTHOR` |
| Cart (add/remove/quantity) | `lib/cart-store.ts`, `components/commerce/*` | Real client-side Zustand store, persisted, fully functional |
| Header/footer/search/nav | `components/layout/*` | Real Prisma-backed nav + site settings, working search that routes to `/books?q=` |
| Razorpay adapter | `packages/payments/src/index.ts` | Real: order creation, payment-signature verify, webhook-signature verify |
| Razorpay webhook | `api/webhooks/razorpay/route.ts` | Real: signature-verified, flips order to `PAID`, fires Inngest event |
| Digital delivery entitlement check | `api/library/[assetId]/route.ts` | Real entitlement/download-count logic — but redirects to a **public** Blob path instead of a signed, expiring one (documented as intentional interim behavior) |
| Inngest jobs | `api/inngest/route.ts` + `packages/jobs/src/functions/{orderConfirmed,projectStatusChanged}.ts` | Real, send real emails via Resend |
| Catalog verticals (`/catalog/[slug]`) | `lib/catalog.ts` | Deliberately static informational pages for product lines with no Prisma model yet (legal stationery, plants, apps) — documented as such, not an oversight |

### Stubbed or disconnected

| Area | File(s) | What's missing |
|---|---|---|
| **Checkout / payment** | `components/commerce/cart-screen.tsx` | "Pay with Razorpay" button has no `onClick` — nothing calls `createRazorpayOrder` or a Server Action. The entire pay flow (create Order + Payment rows, open Razorpay Checkout) doesn't exist yet, even though the adapter and webhook it would call are both real. |
| **"Buy now"** | `components/commerce/buy-box.tsx` | Button renders, no handler. |
| **Digital library** | `account/library/page.tsx` | 100% hardcoded `SAMPLE_LIBRARY_ITEMS`; download button is permanently `disabled` |
| **Self-publishing wizard** | `self-publishing/page.tsx` | Landing/pricing page is real content, but every "Start a project" / "Choose [package]" CTA links to `/self-publishing/wizard/step-1`, a route that **does not exist** in the codebase — a 404 in practice. The multi-step form + draft-persistence flow described in the Technical Design Document hasn't been started. |
| **Malware scan** | `packages/jobs/src/functions/malwareScan.ts` | Hardcoded `return "CLEAN"` — no Cloudmersive/ClamAV integration |
| **Signed digital delivery URLs** | `api/library/[assetId]/route.ts` | Redirects to public Blob path; `packages/storage`'s `getAssetMetadata` doesn't mint expiring URLs |
| **Refunds, review submission** | — | No routes/actions found anywhere in `apps/web` |

## apps/admin — back office

### Real and working (full CRUD, role-checked, audit-logged)

- **Catalogue** (`catalogue/actions.ts`) — create/update/publish, Zod validation, `assertRole(CATALOGUE_WRITE_ROLES)`, writes `AuditLog` rows.
- **Content CMS** — banners, FAQs, testimonials, homepage copy, navigation: every `actions.ts` under `content/*` and `settings/navigation` follows the same real pattern (14 Prisma/assertRole call-sites each in banners/faqs/testimonials/navigation, 6 in homepage).
- **Pricing & site settings** (`settings/pricing/actions.ts`, `settings/site/actions.ts`) — real, role-checked.
- **Image upload** (`api/uploads/route.ts`) — real magic-byte signature verification (JPEG/PNG/GIF/WebP/AVIF), 4MB cap, SVG rejected, role-checked.
- **Dashboard** (`app/page.tsx`) — real live counts (orders to process, pending submissions/service requests, published/draft product counts).
- **Sign-in** — same real Supabase flow as web.

### Real, but explicitly read-only (no stub — the code says so)

- **Orders** (`orders/page.tsx`) — real Prisma list, no status-change action.
- **Reviews** (`reviews/page.tsx`) — real Prisma list of pending reviews; comment: *"Read-only for now — approve/reject actions are still to be built."*
- **Submissions queue** (`submissions/page.tsx`) — real Prisma list of projects + service requests; comment: *"Read-only for now — assigning and moving status is still to be built."*
- **Royalties** (`royalties/page.tsx`), **Analytics** (`analytics/page.tsx`) — real Prisma aggregation queries, display only.
- **Staff & roles** (`settings/roles/page.tsx`) — real Prisma list; comment: role-change Server Action *"doesn't exist yet."*

Nothing in `apps/admin` renders a dead button or fake data — every gap is a page that honestly presents itself as a list with no action attached yet.

## packages/*

| Package | Status |
|---|---|
| `database` | Real. Full Prisma schema (22 models, matches BRD 1:1), working singleton client, `content.ts`/`pricing.ts` registries with DB-overrides-defaults fallback pattern. |
| `auth` | Real. Supabase SSR server/client, middleware factory with role-gating, `assertRole()` used consistently in every admin mutation. |
| `payments` | Real. Razorpay order creation + both signature verifications. **Not yet called from any UI.** |
| `storage` | Real for staging upload, promote, and admin image upload. Signed/expiring URL minting for private delivery is not implemented (matches the library-route gap above). |
| `email` | Real. Resend + two React Email templates, both actually sent by Inngest functions. |
| `jobs` | Real Inngest client + 3 functions wired to the route handler. One function (`malwareScan`) is a hardcoded stub. |
| `ui` | Real. Small set of shadcn-style primitives (button, sheet, dropdown, accordion, etc.), nothing stubbed. |
| `config` | Real. Shared tsconfig/eslint/Tailwind tokens, in active use by both apps. |

## What this means for "phase"

Matching the README's own roadmap (Section 9):

1. **Auth end-to-end** — further along than documented. Sign-in/sign-up UI is real on both apps; I didn't find evidence the `sync_user.sql` trigger has actually been run against a live Supabase project (that's an infra step, not something visible in code).
2. **Cart → checkout → Razorpay → webhook confirms PAID** — the two ends exist (cart UI, webhook) but the middle (a Server Action that creates the Order/Payment and opens Razorpay Checkout) is entirely missing. This is the single biggest gap standing between the current code and a sellable storefront.
3. **Admin catalogue CRUD** — done, and admin is now genuinely the CMS for the whole storefront, as claimed.
4. **Self-publishing wizard + upload/scan pipeline** — landing page only; the wizard itself is unbuilt (dead links), and the scan step is a stub.
5. **Submissions queue actions, royalty calculation job** — queue is read-only by design-for-now; I found no royalty-calculation job (Inngest has no function for it yet).
6. **Reviews/notifications/accessibility/security pass** — review moderation UI doesn't exist; notification rows are written by `projectStatusChanged` but I found no UI in `apps/web` that reads/displays `Notification` rows.

So: still Phase 0, with auth pulled forward and admin pulled significantly forward, while everything downstream of "customer pays" or "customer submits a manuscript" remains to be built.
