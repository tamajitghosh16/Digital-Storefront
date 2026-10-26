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
`apps/admin`, this app is intentionally mostly public — `proxy.ts` runs on
every page to set a per-request nonce CSP (`packages/security`), but only
enforces sign-in on `/account/**` and `/self-publishing/wizard/**` (its
`PROTECTED_PATHS`), with no role restriction beyond "signed in." The root
layout passes the nonce (`x-nonce`) to next-themes' inline script; any new
inline `<script>` must carry it too, and any new third-party script, iframe
or API origin must be added to the CSP in `proxy.ts`.

**Auth = the storefront Supabase project.** This app never sets
`NEXT_PUBLIC_AUTH_SUPABASE_*`, so `packages/auth` falls back to
`NEXT_PUBLIC_SUPABASE_*` and authenticates against the same project that
holds the shared Postgres. `apps/admin` uses a separate auth project (root
`CLAUDE.md`); customer accounts created here can't reach the back office. Role-
specific areas (like the publishing dashboard) enforce their own check in
the page/layout itself.

**Route groups map directly to BRD modules:**
- `app/(storefront)/` — public catalogue, product/service detail pages, the self-publishing landing page. No auth required.
- `app/(account)/` — `layout.tsx` calls `getCurrentUser()` and redirects to `/sign-in` if absent (defense-in-depth behind middleware). `account/publishing/page.tsx` additionally requires `role === "SELF_PUB_AUTHOR"`.
- `app/(checkout)/` — `cart` holds the lines and the "Checkout" section (delivery details: name/email pre-filled from the account, a saved-address picker, Address line 1/2, State · District · City, PIN; then a billing address with a "same as delivery" checkbox, ticked by default, that mirrors the delivery fields read-only until unticked, plus the optional GSTIN); the order snapshots both into `Order.shippingAddress` / `Order.billingAddress`. "Proceed to payment" stores those details in `lib/checkout-store.ts` (sessionStorage) and goes to `payment`, where the shopper picks Cash on Delivery / UPI / Net Banking / cards and places the order. `checkout` only `permanentRedirect`s to `cart`, so old links keep working.
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
bundle uplift, GST rates, tiers) are admin-managed rows,
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
shared Postgres.

**CMS data and catalogue reads are cached.** The database is a Supabase
pooler a few hundred milliseconds away per query, so every CMS read the
chrome and homepage make goes through `lib/cms.ts` — `unstable_cache`
tagged `cms`, wrapped in React `cache()` for per-render dedupe, returned
without `createdAt`/`updatedAt` (the cache round-trips through JSON).
`apps/admin` expires the tag after each save via `app/api/revalidate`
(bearer `STOREFRONT_REVALIDATE_SECRET`); a 60s expiry is the backstop.
Read new CMS data through a `lib/cms.ts` reader, not Prisma directly.
Never price a charge from `getCachedPricingConfig()` — checkout actions and
the cart call `getPricingConfig()` live. Catalogue reads — listings
(`lib/books-data.ts`), detail pages, the homepage's book rows — go through
`lib/products-cache.ts` the same way, under a separate `products` tag the
same `/api/revalidate` ping expires (admin sends it after every `Product`
write). Anything per-user stays uncached, and checkout re-reads each
`Product` live, so a cached price or stock figure never reaches a charge.
Covers are served through the built-in `/_next/image` optimizer (resized
WebP, cached a month) — originals are full-size scans. Per-product SEO
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

**`app/api/library/[assetId]/route.ts`** checks purchase entitlement with
the shared `entitledAssetsWhere()` (`lib/library.ts`: a scanned-`CLEAN`
`EBOOK_FILE` reached through an `OrderItem` with `includesEbook` on a paid-
or-later order owned by the caller — buying only the print edition does
*not* unlock the PDF), then atomically claims one of the caller's
downloads in `LibraryDownload` (per customer, per file — `maxDownloads` is
a per-customer allowance), then redirects to the file. For an e-book uploaded from `apps/admin` the stored
`blobPath` is a **private** Supabase Storage path, so the route mints a
~5-minute signed URL via `createEbookDownloadUrl()` (`@repo/storage`); a
legacy/seed row whose `blobPath` is already an `https` URL is redirected
as-is (any other scheme is refused). Needs `SUPABASE_SERVICE_ROLE_KEY` (server-only) + a private `ebooks`
bucket.

**Checkout is wired: `app/(checkout)/actions.ts`.** Both payment paths share
`prepareOrder`, which validates the cart and delivery details with zod (at
most 50 lines, quantity 1–100; state must be one of the 36 in
`lib/india-address.ts`), refuses unpublished, out-of-stock and wrong-format
lines, re-derives every line price from `Product` (never trusts the client
cart), sets `OrderItem.includesEbook`, and snapshots the delivery address
into `Order.shippingAddress` (a saved `Address` can change later). Delivery
is always standard — checkout no longer offers a speed.
`placeCodOrder` (Cash on Delivery, the only method live until Razorpay is
configured) creates the `Order` as `PROCESSING` with a `Payment` of method
`COD`, status `CREATED`, and queues `order/confirmed` in `after()`, once the
response has gone (with no `INNGEST_EVENT_KEY` locally, `inngest.send` spends
~6s retrying 401s from Inngest Cloud); it refuses any cart
with an e-book or service line, because `PROCESSING` is an entitling status
in `lib/library.ts`. `startCheckout` (UPI / net banking / cards) requires a
signed-in user, is rate-limited, creates the `Order` + `Payment` and a real
Razorpay order; `payment-screen.tsx` opens Razorpay Checkout with it.
`confirmCheckout` verifies the returned signature **and** that the Razorpay
order id is the one stored on *this* order's `Payment` (a signature alone
only proves some payment happened — without this one receipt could settle
any order), fetches the payment from Razorpay to check amount, currency and
captured status, then settles through `settleOrderPayment()`
(`lib/orders.ts`) — the same function the webhook uses. That does a
conditional `PENDING → PAID` update (so it's **idempotent** and the email
fires once) and relies on `Payment.gatewayPaymentId` being unique. The
webhook (`api/webhooks/razorpay`) remains the authoritative status source and
also cross-checks amount and currency. Discount codes are looked up one at a time
on the server (`lib/discounts.ts`, rules in `@repo/database`'s
`discounts.ts`): `checkCoupon` validates a code for the cart and returns only
its terms, and `prepareOrder` re-checks every rule (on/off, dates, total and
per-customer uses, minimum order) and records `Order.discountCents` /
`discountCode`. The code list is not part of `PricingConfig` and must never
reach the browser; Client Components import the shared maths from
`@repo/database/discounts`, never the package root. Sign-in is also
gated client-side on "Buy now" (`buy-box.tsx`) and the cart's "Proceed to
payment", and server-side on `/payment` itself.

**Account pages read real data only** — no `withFallback`/sample data under
`app/(account)/`: a customer sees their own orders, library and projects, or
nothing. `account/library/page.tsx` uses the same `entitledAssetsWhere()` as
the download route and shows the caller's own remaining downloads.
