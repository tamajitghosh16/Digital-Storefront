# Digital Storefront — Shashibhushan's New School Book Press

Starter monorepo for the platform described in the Technical Design
Document (`Digital_Storefront_Technical_Design_Document_v1.1.docx`). This
is Phase 0 scaffolding: real project structure, a complete Prisma schema,
shared packages with working (but simplified) implementations, and stub
pages for every module in the BRD's functional requirements — not a
finished app. Every stub page has a comment pointing back to the FR/section
it implements.

## What's here

```
apps/
  web/     — customer storefront (catalogue, cart, checkout, self-publishing wizard, account)
  admin/   — internal back office (catalogue CMS, orders, submissions queue, royalties, roles)
packages/
  database/ — Prisma schema (single source of truth) + client
  auth/     — Supabase Auth server/client helpers, role guards, middleware factory
  payments/ — Razorpay order creation + signature verification
  storage/  — Vercel Blob upload/staging helpers
  email/    — Resend + React Email templates
  jobs/     — Inngest event catalogue + notification/malware-scan functions
  ui/       — shared button component + cn() utility (shadcn/ui-style)
  config/   — shared tsconfig, eslint, Tailwind v4 design tokens
```

## How "monorepo" and "two standalone apps" fit together

`apps/web` and `apps/admin` **are** two independent Next.js applications —
separate `package.json`, separate `next.config.ts`, separate ports, separate
build output, separate production URLs. The monorepo doesn't merge them
into one runtime; it's a way to share the *source code* in `packages/*`
(the Prisma schema, auth helpers, Razorpay adapter, etc.) between two
otherwise unrelated apps via npm workspace symlinks, and to let Turborepo
run/build/cache both efficiently from one `npm install`.

At build time, each app only bundles the shared package code it actually
imports (`transpilePackages` in each `next.config.ts`). At runtime, `web`
and `admin` never call each other over HTTP — they're fully decoupled and
only happen to read/write the same Supabase Postgres database.

> **Package manager:** this repo uses npm workspaces (root `package.json`
> has a `"workspaces"` field; internal `@repo/*` deps are pinned to `"*"`
> so npm links them to the local package instead of fetching from the
> registry). Everything below assumes `npm`, not `pnpm`.

**Running them:**
```bash
npm run dev          # both apps in parallel — web:3000, admin:3001
npm run dev:web      # storefront only
npm run dev:admin    # back office only
```
Either one runs fine on its own, as long as `packages/database`'s Prisma
client has been generated once (`npm run db:generate` — both apps import
`@repo/database`) and that app's own `.env.local` is filled in.

**Deploying them:** two separate Vercel projects pointing at the *same*
GitHub repo. In each project's Settings → General, set **Root Directory**
to `apps/web` or `apps/admin`. Vercel detects the npm workspace + Turborepo
setup automatically (via `package-lock.json` and `turbo.json`), installs
once from the repo root, then builds only that app's directory — giving
you two independently deployed, independently scaled apps with separate
env vars and separate URLs (e.g. `yourdomain.com` and
`admin.yourdomain.com`), exactly as described in the Technical Design
Document's HLD (Section 2.2).

## Before you run anything — accounts to create

Per the Technical Design Document's "Credential sovereignty" note (Section
6): create every one of these under the Publisher's own corporate
email/organization, not a personal developer account. Migrating ownership
later is a real cost.

1. **GitHub** — organization + this repo, private.
2. **Vercel** — team account linked to the GitHub org; two projects (`web`, `admin`) once the repo is pushed.
3. **Supabase** — **two** projects:
   - *Storefront* project (Postgres + customer Auth). From Project Settings: API → `Project URL`, `anon public` key, `service_role` key; Database → pooled `DATABASE_URL` and direct `DIRECT_URL`.
   - *Admin auth* project — authentication for `apps/admin` only, so staff identities can't be created by the storefront's public signup. Run `docs/setup/admin-auth-project.sh` for the guided setup (creates the project's `users` table via `sync_staff.sql`, disables sign-ups, creates the Owner). `apps/admin` still uses the storefront project's Postgres and Storage.
4. **Razorpay** — business account (test mode keys are enough to start); note the Key ID/Secret and set up a webhook once you have a deploy URL.
5. **Resend** — account + a verified sending domain (or use their sandbox domain while testing).
6. **Domain/DNS** — registrar account under the Publisher's org, if not already owned.

## Local setup

```bash
npm install                                     # from the repo root — links all workspace packages
cp apps/web/.env.example apps/web/.env.local     # fill in with the values gathered above
cp apps/admin/.env.example apps/admin/.env.local # admin's template differs: no web-only vars (e.g. NEXT_PUBLIC_RAZORPAY_KEY_ID), plus its own NEXT_PUBLIC_AUTH_SUPABASE_* (separate auth project) and SUPABASE_SERVICE_ROLE_KEY
cp packages/database/.env.example packages/database/.env # DATABASE_URL/DIRECT_URL, read by the Prisma CLI directly

npm run db:generate                   # generate the Prisma client
npm run db:migrate                    # create tables in the storefront Supabase project
# then, in the STOREFRONT project's SQL editor, run:
#   packages/database/prisma/sql/sync_user.sql
# (keeps public.users in sync with Supabase's auth.users, and sets up the
# starter Row-Level Security policies)
#
# and set up the separate ADMIN AUTH project (guided):
bash docs/setup/admin-auth-project.sh
# (creates its users table via sync_staff.sql, disables sign-ups, creates
# the Owner, and prints the NEXT_PUBLIC_AUTH_SUPABASE_* values for
# apps/admin/.env.local)

npm run seed --workspace=@repo/database   # optional: adds 3 sample products

npm run dev                           # runs both apps via Turborepo
# apps/web   → http://localhost:3000
# apps/admin → http://localhost:3001
```

## What's real vs. what's a stub

**Real / working today:**
- Prisma schema — every entity from the BRD's Data Model Overview, with enums, indexes, and relations.
- `packages/auth` — actual Supabase SSR client setup (server + browser) and a reusable middleware factory with role-gating. `apps/web` and `apps/admin` authenticate against **separate Supabase projects** (`packages/auth/src/env.ts`); a storefront customer account can't reach the back office.
- `packages/payments` — real Razorpay order creation, payment signature verification, and webhook signature verification.
- The Razorpay webhook route (`apps/web/app/api/webhooks/razorpay/route.ts`) — marks orders PAID and fires the `order/confirmed` Inngest event on `payment.captured`.
- `packages/jobs` — a working Inngest client with 3 functions wired to `apps/web/app/api/inngest/route.ts`.
- `packages/email` — real Resend + React Email templates.
- All list/detail pages that read from Postgres (homepage, catalogue, orders, submissions queue, royalties, analytics) — these run real Prisma queries today.
- **Admin catalogue create/edit/publish forms** (`apps/admin/app/educational-material/books`) — full CRUD with Zod validation, `assertRole`, and `AuditLog` entries. The form adapts to what you're selling (printed book / e-book / service package) and only asks for the fields that apply, generates the web address from the title, and takes the front cover from a **file picker with a live preview** rather than asking for a URL.
- **Admin inventory CMS for three more Educational Materials lines** (`apps/admin/app/educational-material/{educational-charts,worksheets-activity-puzzles,teaching-learning-materials}`) — same list/create/edit/publish shape as Books, sharing one trimmed form + Server Actions in `educational-material/_shared/`; each writes its own `Product.productLine` value, and the Books views (admin + storefront) now filter to `productLine: "BOOK"` so the three don't leak into the book listings.
- **Cover and banner image upload** (`apps/admin/app/api/uploads` → `packages/storage`'s `uploadImage`) — role-checked, 4 MB cap, magic-byte type verification, SVG refused. Stores to the public `images` Supabase Storage bucket via `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (no separate token); without those the image fields say so and fall back to pasting a link.
- **Admin-as-CMS for the storefront** (`apps/admin/app/settings/site`, `settings/navigation`, `settings/pricing`, `content/banners`, `content/homepage`, `content/faqs`, `content/testimonials`) — site branding/SEO defaults, header/footer nav, the homepage hero, **every other homepage heading and description**, FAQs, testimonials, and **the pricing rules** are all admin-managed rows (`SiteSettings`, `NavLink`, `Banner`, `ContentBlock`, `Faq`, `Testimonial`, `PricingSettings`, `ClassSetTier`, `DiscountCode`) that `apps/web`'s root layout, header, footer, homepage, product pages and cart read directly — no runtime call between the two apps, same shared-Postgres pattern as `Product`. Per-product SEO fields (`metaTitle`/`metaDescription`/`ogImageUrl`) are also admin-editable and rendered via `generateMetadata` on the product detail pages.
  - *Homepage text* works off a registry in `packages/database/src/content.ts` that carries each string's label, help text and **default copy**; the database stores only overrides, so clearing a box in the admin restores the original wording and the storefront can never render blank.
  - *Pricing & delivery* covers the free-delivery threshold, express/same-day fees and their arrival wording, the print + e-book bundle uplift, GST rates, class-set quantity discounts, and checkout discount codes. The defaults reproduce exactly what the storefront used to hardcode.

**Stubbed — needs implementation:**
- Sign-in UI (Supabase Auth's email/OAuth components aren't wired into `app/sign-in`).
- Add-to-cart Server Action, checkout Server Action (create Order + Razorpay order together), shipping/tax calculation.
- The self-publishing wizard's actual multi-step form (currently a static step list).
- File upload UI + the staging → malware-scan → promote pipeline end-to-end (the pieces exist in `packages/storage` and `packages/jobs/functions/malwareScan.ts`, but the scan() function is a stub returning `"CLEAN"` — wire up Cloudmersive or a ClamAV sidecar).
- Signed, expiring Blob URLs for digital delivery (`api/library/[assetId]/route.ts` currently redirects to the public path).
- Refund flow, review moderation actions.
- Product-line/department categorization in the UI — `Product.productLine` (the 8 lines across 5 departments) is a real schema field now, and `packages/database/src/taxonomy.ts` is its canonical label list, but `apps/admin`'s `FIXED_DEPARTMENTS` and `apps/web`'s `buildDepartments()` still hardcode their own copy instead of reading from it. Four of the eight lines now have an admin CMS that writes the field (Books plus Educational Charts / Worksheets & Activity Puzzles / Teaching & Learning Materials); the storefront still has no per-line browsing for the latter three. See root `CLAUDE.md`'s "Product & service taxonomy" section.

## Suggested order of work

Matches the roadmap in the Technical Design Document, Section 9:

1. Finish auth end-to-end (sign-in/sign-up UI, session on both apps, confirm `sync_user.sql` fires on the storefront project and `sync_staff.sql` on the admin auth project). The "revamped admin auth" work (MFA, `settings/roles` staff management) also lands here.
2. Add-to-cart + checkout Server Action + Razorpay Checkout on the client; confirm the webhook flips an order to PAID.
3. ~~Admin catalogue CRUD~~ — done; admin is now the CMS for the whole storefront (site settings, nav, hero, every homepage heading and description, FAQs, testimonials, and pricing), with cover-image upload built into the catalogue form.
4. Self-publishing wizard (steps 1–6), file upload + malware scan pipeline.
5. Submissions queue actions (assign, move status, publish → auto-create Product), royalty calculation job.
6. Reviews, notifications end-to-end, accessibility/security pass before launch.

## A note on this scaffold

Package versions in each `package.json` are pinned to the majors called out
in the Technical Design Document (Next.js 16, React 19, Prisma 7, Tailwind
v4) — run `npm install` and let your lockfile resolve exact minor/patch
versions at build time, since those move fast. This sandbox's network
policy blocked fetching Prisma's engine binaries, so `prisma validate` /
`prisma generate` haven't been run here — do that as your first step
locally to confirm the schema compiles cleanly (it's been checked by hand
for balanced relations and syntax, but Prisma's own validator is the real
test).
