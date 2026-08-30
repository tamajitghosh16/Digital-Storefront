# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Scoped to `apps/web` — the public storefront and customer account area. See
the root `CLAUDE.md` for monorepo-wide commands and shared-package
architecture (auth, database, payments, jobs).

## Commands

Run from `apps/web`, or via `npm run <script> --workspace=web` from the repo root.

```bash
npm run dev          # next dev --turbopack, port 3000
npm run build
npm run lint
npm run typecheck
```

## Architecture

**Audience: Guests, Readers, and Self-Publishing Authors.** Unlike
`apps/admin`, this app is intentionally mostly public — `proxy.ts`
only guards `/account/**` and `/self-publishing/wizard/**` (see its
`matcher`), and applies no role restriction beyond "signed in." Role-
specific areas (like the publishing dashboard) enforce their own check in
the page/layout itself.

**Route groups map directly to BRD modules:**
- `app/(storefront)/` — public catalogue, product/service detail pages, the self-publishing landing page. No auth required.
- `app/(account)/` — `layout.tsx` calls `getCurrentUser()` and redirects to `/sign-in` if absent (defense-in-depth behind middleware). `account/publishing/page.tsx` additionally requires `role === "SELF_PUB_AUTHOR"`.
- `app/(checkout)/` — `cart` is the whole cart-and-checkout screen (lines, delivery details and payment on one page, as the approved design specifies). `checkout` only `permanentRedirect`s to it, so old links keep working.
- `app/api/` — the three Route Handlers that need a stable HTTP contract: `webhooks/razorpay` (payment source of truth), `inngest` (serves `packages/jobs` functions), `library/[assetId]` (entitlement-checked digital delivery).

**Components are grouped by role, not by page:**
- `components/layout/` — the chrome: promo marquee, utility bar, masthead, department bar with its hover mega-panels, mobile drawer, footer, theme toggle. The department bar's 5 departments/8 product lines come from `lib/navigation.ts`'s `buildDepartments()`, hardcoded to mirror `apps/admin/components/sidebar-nav.tsx`'s `FIXED_DEPARTMENTS` by hand rather than importing `PRODUCT_LINE_CATALOG` from `@repo/database` — see root `CLAUDE.md`'s "Product & service taxonomy" section for the canonical list, `Product.productLine`, and why the nav files don't read from it yet.
- `components/commerce/` — anything that sells: the book jacket (four drawable faces), product tile, catalogue and product page bodies, buy box, cart screen.
- `components/marketing/` — the repeating content blocks: hero, category circles, trust band, dark plan band, newsletter, FAQ.
- `components/primitives/` — this storefront's style-only pieces (`Wrap`, `buttonClass`, `Callout`, `SectionHead`, table classes). Distinct from `@repo/ui`, which holds the *behavioural* primitives apps/admin shares.
- `components/account/` — the signed-in area's navigation.

**Design tokens live in `packages/config/tailwind-preset.css`, and there is
only one set.** Geometry follows Vistaprint's "Swan" system (16px tile /
8px button / pill radii, 700-weight display type on −0.03em tracking, a
12px/700/+0.083em caps style); colour is sampled from `public/logo.svg`
and `logo-dark.svg` (`#007ACC` brand, `#1D1C5E` ink, `#F4F7FB` page). The
legacy semantic names (`background`, `foreground`, `card`, `border`, …)
are re-pointed onto that palette so `packages/ui` and apps/admin keep
working without a second system.

**Cart state lives in `lib/cart-store.ts`** — a Zustand store persisted to
`localStorage`, not yet synced to the database on login/checkout (see root
README's stub list). `CartItem` carries `listPriceCents` and `taxType`
alongside the net price so the cart can show bundle savings and per-line
GST.

**`lib/pricing.ts` holds three mechanics the schema doesn't cover yet** —
class-set quantity tiers, the print + e-book bundle, and per-line GST
(printed books nil-rated) — derived from the printed price, which is why
they live in one module: it's the single place to delete from once
`Product` carries real pricing.

It holds the *arithmetic only*. The numbers (delivery threshold and fees,
bundle uplift, GST rates, tiers, discount codes) are admin-managed rows,
read with `getPricingConfig()` from `@repo/database`. Every function here
takes that config as an argument rather than importing it, because
`buy-box.tsx`, `cart-screen.tsx` and `promo-bar.tsx` need the numbers but
two of them are Client Components — a Server Component loads the config
once and passes it down as a prop, so Prisma never reaches the browser
bundle. If you add a pricing rule, put the number in
`packages/database/src/pricing.ts` (with a default equal to current
behaviour) and the maths here.

**`lib/sample-data/`** is split by concern (`books`, `services`, `cms`,
`account`, `shared`) and re-exported from `index.ts`; import from
`@/lib/sample-data`.

**No user-visible string on the homepage is hardcoded — all of it is
admin-controlled.** `app/layout.tsx`'s `generateMetadata` and
`components/layout/site-header.tsx`/`site-footer.tsx` read the singleton
`SiteSettings` row (via `@repo/database`'s `getSiteSettings()`) and
`NavLink` rows. `app/page.tsx` reads `Banner` (the first active row *is*
the hero, including its eyebrow and both buttons), `Testimonial`, `Faq`,
`getPricingConfig()` for the class-set table, and `getContent()` for
everything else — every section heading, standfirst, promise, button label
and piece of small print. All of it is edited from `apps/admin`
(`settings/site`, `settings/navigation`, `settings/pricing`,
`content/banners`, `content/homepage`, `content/faqs`,
`content/testimonials`); there's no API call to admin, just the same
shared-Postgres read pattern already used for `Product`. Per-product SEO
metadata (`Product.metaTitle`/`metaDescription`/`ogImageUrl`, editable from
the admin catalogue form) is rendered via `generateMetadata` on each of
`books/[slug]`, `ebooks/[slug]`, and `services/[slug]`.

**`getContent()` cannot return a blank string.** It merges stored
`ContentBlock` overrides onto the defaults declared in
`packages/database/src/content.ts`, and treats a blank override as "not
set". So `content["homepage.faq.title"]` is always safe to render
directly, and the key is a typed union — a typo won't compile. Components
that show this copy (`TrustBand`, `Newsletter`, `PlanBand`, `Hero`) take
it as props rather than reaching for it themselves, which keeps them
usable from `catalog/[slug]` too.

**`app/api/library/[assetId]/route.ts`** checks purchase entitlement and
the per-asset download-count limit before serving a file, but currently
redirects to the asset's public Blob path rather than minting a signed,
expiring URL — that's a known stub, not the intended final behavior (FR-9.1/9.2 in the BRD).
